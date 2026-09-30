import { toaster } from "@/app/components/ui/toaster";
import { isFrontDoorEnabled } from "@/app/config/front-door";
import { showApiError } from "@/app/hooks/useErrorHandler";
import { submitOrttoProfile } from "@/app/lib/ortto";
import { queryClient } from "@/app/lib/query-client";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import { patchProfile } from "../api/profile";
import { PREFILL_NOT_FOUND } from "../api/profile-prefill";
import { profileOptionsQuery, profilePrefillQuery } from "../api/queries";
import { personNames } from "../lib/person-names";
import {
  loadProfileAskRecord,
  saveProfileAskRecord,
  type ProfileAskStorages,
} from "../lib/profile-ask-storage";
import {
  recordAnswer,
  recordAskDismissed,
  recordAskShown,
  type ProfileAskRecord,
} from "../model/profile-ask";
import type {
  ProfileCardPatch,
  ProfilePromptData,
} from "../model/profile-card";
import useProfileNudgeStore from "../model/profile-nudge-store";

/**
 * The front door's "ask for the profile later" flow, outside React (like
 * show-create-dashboard-nudge): react to finished answers, add the in-chat
 * card or the later banner, and handle Save / Not now. Everything no-ops unless
 * NEXT_PUBLIC_FRONT_DOOR is on and the signed-in person has no profile.
 */

export interface ProfileAskDeps {
  storages: () => ProfileAskStorages;
}

function safeStorage(get: () => Storage): Storage | null {
  try {
    return get();
  } catch {
    // Accessing the storage object itself can throw (blocked site data).
    return null;
  }
}

export function browserStorages(): ProfileAskStorages {
  if (typeof window === "undefined") return { local: null, session: null };
  return {
    local: safeStorage(() => window.localStorage),
    session: safeStorage(() => window.sessionStorage),
  };
}

const BROWSER: ProfileAskDeps = { storages: browserStorages };

/** Keys the ask record and the prefill cache; "" when nobody is signed in. */
function userKey(): string {
  const { userId, userEmail } = useAuthStore.getState();
  return userId || userEmail || "";
}

function updateRecord(
  deps: ProfileAskDeps,
  change: (record: ProfileAskRecord) => ProfileAskRecord
): void {
  const key = userKey();
  if (!key) return;
  const storages = deps.storages();
  saveProfileAskRecord(
    storages,
    key,
    change(loadProfileAskRecord(storages, key))
  );
}

async function loadPromptData(): Promise<ProfilePromptData | null> {
  const key = userKey();
  try {
    const [options, prefill] = await Promise.all([
      queryClient.fetchQuery(profileOptionsQuery),
      // A failed GFW lookup only means an empty card.
      queryClient.fetchQuery(profilePrefillQuery(key)).catch((err) => {
        console.error("Profile card: GFW prefill lookup failed", err);
        return PREFILL_NOT_FOUND;
      }),
    ]);
    const data: ProfilePromptData = { options };
    if (prefill.suggestion) data.suggestion = prefill.suggestion;
    if (prefill.firstName) data.firstName = prefill.firstName;
    if (prefill.lastName) data.lastName = prefill.lastName;
    return data;
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
  options: { threadId?: string | null } = {}
): Promise<boolean> {
  const data = await loadPromptData();
  if (!data || useAuthStore.getState().hasProfile) return false;

  const chat = useChatStore.getState();
  if (
    options.threadId !== undefined &&
    (chat.currentThreadId !== options.threadId || chat.isLoading)
  ) {
    return false;
  }
  chat.messages
    .filter((m) => m.type === "profile-prompt")
    .forEach((m) => chat.removeMessage(m.id));
  chat.addMessage({ type: "profile-prompt", message: "", profilePrompt: data });
  useProfileNudgeStore.getState().closeBanner();
  return true;
}

/** An answer finished live on the current thread (chatStore.completedAnswers). */
export async function handleAnswerCompleted(
  deps: ProfileAskDeps = BROWSER
): Promise<void> {
  if (!isFrontDoorEnabled()) return;
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated || auth.hasProfile) return;
  const key = userKey();
  if (!key) return;

  const storages = deps.storages();
  const { record, ask } = recordAnswer(
    loadProfileAskRecord(storages, key),
    false
  );
  saveProfileAskRecord(storages, key, record);

  if (ask === "first_answer") {
    const threadId = useChatStore.getState().currentThreadId;
    if (await showProfilePrompt({ threadId })) {
      updateRecord(deps, recordAskShown);
    }
  } else if (ask === "nth_question") {
    useProfileNudgeStore.getState().openBanner();
    updateRecord(deps, recordAskShown);
  }
}

/** Subscribes to finished answers; returns the unsubscribe. */
export function watchAnswerCompletions(
  deps: ProfileAskDeps = BROWSER
): () => void {
  return useChatStore.subscribe((state, prev) => {
    if (state.completedAnswers > prev.completedAnswers) {
      void handleAnswerCompleted(deps);
    }
  });
}

/** "Not now" on the card. */
export function dismissProfileAsk(
  messageId: string,
  deps: ProfileAskDeps = BROWSER
): void {
  updateRecord(deps, recordAskDismissed);
  useChatStore.getState().removeMessage(messageId);
}

/** The banner's close button: also a "Not now". */
export function dismissProfileBanner(deps: ProfileAskDeps = BROWSER): void {
  updateRecord(deps, recordAskDismissed);
  useProfileNudgeStore.getState().closeBanner();
}

/** The banner's "Add details": the card, at the end of the conversation. */
export async function openProfileCardFromBanner(): Promise<void> {
  if (!(await showProfilePrompt())) {
    showApiError("The profile form couldn't load.", {
      title: "Couldn't open your profile",
      description: "Please try again, or use Settings.",
    });
  }
}

/**
 * Save on the card: PATCH the partial profile (throws on failure, and the
 * card stays), then mark the profile complete, remove the card and tell
 * Ortto (fire-and-forget, like the onboarding form).
 */
export async function saveProfileFromCard(
  messageId: string,
  prompt: ProfilePromptData,
  patch: ProfileCardPatch
): Promise<void> {
  await patchProfile(patch);

  const auth = useAuthStore.getState();
  auth.markProfileComplete();
  useChatStore.getState().removeMessage(messageId);
  useProfileNudgeStore.getState().closeBanner();
  toaster.create({
    title: "Profile saved",
    description: "Thanks. You can change these details in Settings.",
    type: "success",
    duration: 3000,
  });

  if (auth.userEmail) {
    // Never sends receiveNewsEmails: the card asks for no consent.
    void submitOrttoProfile({
      email: auth.userEmail,
      ...personNames(prompt, auth.userName),
      sector: patch.sector_code,
      companyOrganization: patch.company_organization,
      countryCode: patch.country_code,
    });
  }
}
