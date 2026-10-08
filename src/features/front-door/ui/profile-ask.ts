import { toaster } from "@/app/components/ui/toaster";
import { showApiError } from "@/app/hooks/useErrorHandler";
import { orttoTopicLabels, submitOrttoProfile } from "@/app/lib/ortto";
import { trackEvent } from "@/app/lib/track-event";
import { queryClient } from "@/app/lib/query-client";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import { patchProfile } from "../api/profile";
import { PREFILL_NOT_FOUND, type ProfilePrefill } from "../api/profile-prefill";
import { profileOptionsQuery, profilePrefillQuery } from "../api/queries";
import { personNames } from "../lib/person-names";
import { isProfileAskActive, selectProfileUserKey } from "./profile-ask-gate";
import {
  loadProfileAskRecord,
  saveProfileAskRecord,
  type ProfileAskStorage,
} from "../lib/profile-ask-storage";
import { recordAnswer, recordAskShown } from "../model/profile-ask";
import type { ProfileCardPatch } from "../model/profile-card";
import useProfileNudgeStore from "../model/profile-nudge-store";

/**
 * The front door's "ask for the profile later" flow, outside React (like
 * show-create-dashboard-nudge): react to finished answers, add the in-chat
 * card or the later banner, and handle Save / Not now. Everything no-ops unless
 * the signed-in person has no profile.
 */

export function browserStorage(): ProfileAskStorage {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Accessing the storage object itself can throw (blocked site data).
    return null;
  }
}

function userKey(): string {
  return selectProfileUserKey(useAuthStore.getState());
}

/** Re-read after the card's data loaded: another tab may have written since. */
function markCardShown(storage: ProfileAskStorage): void {
  const key = userKey();
  if (!key) return;
  saveProfileAskRecord(
    storage,
    key,
    recordAskShown(loadProfileAskRecord(storage, key), "card")
  );
}

/** Starts loading what the card needs, so it's ready when an ask comes. */
export function prefetchProfilePrompt(): void {
  void queryClient.prefetchQuery(profileOptionsQuery);
  void queryClient.prefetchQuery(profilePrefillQuery(userKey()));
}

/**
 * Settles the card's options and GFW prefill in the query cache, where the
 * card reads them. A failed GFW lookup is cached as "not found" (an empty
 * card); failing to load the options means no card. Returns the prefill.
 */
async function settlePromptData(): Promise<ProfilePrefill | null> {
  const prefillQuery = profilePrefillQuery(userKey());
  try {
    const [, prefill] = await Promise.all([
      queryClient.fetchQuery(profileOptionsQuery),
      queryClient.fetchQuery(prefillQuery).catch((err) => {
        console.error("Profile card: GFW prefill lookup failed", err);
        queryClient.setQueryData(prefillQuery.queryKey, PREFILL_NOT_FOUND);
        return PREFILL_NOT_FOUND;
      }),
    ]);
    return prefill;
  } catch (err) {
    console.error("Profile card: couldn't load the profile options", err);
    return null;
  }
}

/**
 * Adds the profile card at the end of the conversation (one at a time).
 * With `threadId`, only if that thread is still current and idle once the
 * card's data has loaded, so a late card never lands in a new conversation
 * or in the middle of the next answer. Returns whether the card was added.
 */
export async function showProfilePrompt(
  options: {
    threadId?: string | null;
    trigger?: "first_answer" | "banner";
  } = {}
): Promise<boolean> {
  const prefill = await settlePromptData();
  if (!prefill || useAuthStore.getState().hasProfile) return false;

  const chat = useChatStore.getState();
  if (
    options.threadId !== undefined &&
    (chat.currentThreadId !== options.threadId || chat.isLoading)
  ) {
    return false;
  }
  chat.upsertProfilePrompt();
  useProfileNudgeStore.getState().closeBanner();
  trackEvent({
    event: "profile_card_shown",
    trigger: options.trigger ?? "banner",
    prefilled: prefill.suggestion !== undefined,
  });
  return true;
}

/** The answer just finished is to the conversation's first question. */
function isFirstAnswerOfConversation(): boolean {
  const questions = useChatStore
    .getState()
    .messages.filter((m) => m.type === "user");
  return questions.length === 1;
}

/** An answer finished live on the current thread (chatStore.completedAnswers). */
export async function handleAnswerCompleted(
  storage: ProfileAskStorage = browserStorage()
): Promise<void> {
  if (!isProfileAskActive()) return;
  const key = userKey();
  if (!key) return;

  const { record, ask } = recordAnswer(
    loadProfileAskRecord(storage, key),
    isFirstAnswerOfConversation()
  );
  // The banner shows at once; the card only once its data has loaded.
  saveProfileAskRecord(
    storage,
    key,
    ask === "banner" ? recordAskShown(record, "banner") : record
  );

  if (ask === "banner") {
    openProfileBanner();
  } else if (ask === "card") {
    const threadId = useChatStore.getState().currentThreadId;
    if (await showProfilePrompt({ threadId, trigger: "first_answer" })) {
      markCardShown(storage);
    }
  }
}

/**
 * Subscribes to finished answers, and closes the banner when its
 * conversation is left (each new conversation earns its own). Returns the
 * unsubscribe.
 */
export function watchAnswerCompletions(
  storage: ProfileAskStorage = browserStorage()
): () => void {
  return useChatStore.subscribe((state, prev) => {
    if (
      prev.currentThreadId !== null &&
      state.currentThreadId !== prev.currentThreadId
    ) {
      useProfileNudgeStore.getState().closeBanner();
    }
    if (state.completedAnswers > prev.completedAnswers) {
      void handleAnswerCompleted(storage);
    }
  });
}

/** "Not now" on the card. The banner policy doesn't depend on it. */
export function dismissProfileAsk(messageId: string): void {
  useChatStore.getState().removeMessage(messageId);
  trackEvent({ event: "profile_card_dismissed", surface: "card" });
}

/** Opens the lighter banner, loading the card it leads to meanwhile. */
export function openProfileBanner(): void {
  prefetchProfilePrompt();
  useProfileNudgeStore.getState().openBanner();
}

/** The banner's close button. */
export function dismissProfileBanner(): void {
  useProfileNudgeStore.getState().closeBanner();
  trackEvent({ event: "profile_card_dismissed", surface: "banner" });
}

/** The banner's "Add details": the card, at the end of the conversation. */
export async function openProfileCardFromBanner(): Promise<void> {
  if (!(await showProfilePrompt({ trigger: "banner" }))) {
    showApiError("The profile form couldn't load.", {
      title: "Couldn't open your profile",
      description: "Please try again, or use User Profile.",
    });
  }
}

/** Topic codes as their labels, for Ortto (as the onboarding form sends them). */
function topicLabels(codes: string[] | undefined): string[] | undefined {
  if (!codes?.length) return undefined;
  const options = queryClient.getQueryData(profileOptionsQuery.queryKey);
  return orttoTopicLabels(codes, options?.topics);
}

/**
 * Save on the card: PATCH the partial profile (throws on failure, and the
 * card stays), then mark the profile complete, remove the card and tell
 * Ortto (fire-and-forget, like the onboarding form).
 */
export async function saveProfileFromCard(
  messageId: string,
  patch: ProfileCardPatch,
  prefill: ProfilePrefill = PREFILL_NOT_FOUND
): Promise<void> {
  const { status } = await patchProfile(patch);
  if (status) useAuthStore.getState().setAuthStatus(status);

  const auth = useAuthStore.getState();
  useChatStore.getState().removeMessage(messageId);
  useProfileNudgeStore.getState().closeBanner();
  trackEvent({
    event: "profile_card_saved",
    prefilled: prefill.suggestion !== undefined,
    news_emails: patch.receive_news_emails === true,
  });
  toaster.create({
    title: "Profile saved",
    description: "Thanks. You can change these details in your User Profile.",
    type: "success",
    duration: 3000,
  });

  if (auth.userEmail) {
    // Names typed on the card (the email opt-in) win over GFW and Okta's.
    const names = personNames(
      {
        firstName: patch.first_name ?? prefill.firstName,
        lastName: patch.last_name ?? prefill.lastName,
      },
      auth.userName
    );
    void submitOrttoProfile({
      email: auth.userEmail,
      ...names,
      sector: patch.sector_code ?? undefined,
      companyOrganization: patch.company_organization ?? undefined,
      countryCode: patch.country_code ?? undefined,
      Topics: topicLabels(patch.topics),
      receiveNewsEmails: patch.receive_news_emails,
    });
  }
}
