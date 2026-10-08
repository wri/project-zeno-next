import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getToken: () => "token",
}));
vi.mock("@/app/hooks/useErrorHandler", () => ({
  showApiError: vi.fn(),
  showError: vi.fn(),
  showServiceUnavailableError: vi.fn(),
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/app/lib/ortto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/ortto")>()),
  submitOrttoProfile: vi.fn(),
}));
vi.mock("@/app/lib/track-event", () => ({ trackEvent: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import {
  agentTextLine,
  humanLine,
  ndjsonResponse,
} from "@/app/store/__tests__/stream-fixtures";
import { MemoryStorage } from "../../lib/__tests__/memory-storage";
import { submitOrttoProfile } from "@/app/lib/ortto";
import { trackEvent } from "@/app/lib/track-event";
import { queryClient } from "@/app/lib/query-client";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import {
  loadProfileAskRecord,
  saveProfileAskRecord,
} from "../../lib/profile-ask-storage";
import type { ProfileAskRecord } from "../../model/profile-ask";
import { profileOptionsQuery, profilePrefillQuery } from "../../api/queries";
import useProfileNudgeStore from "../../model/profile-nudge-store";
import {
  dismissProfileAsk,
  dismissProfileBanner,
  handleAnswerCompleted,
  openProfileCardFromBanner,
  saveProfileFromCard,
  showProfilePrompt,
  watchAnswerCompletions,
} from "../profile-ask";

// ── Fixtures ──────────────────────────────────────────────────────────────

const CONFIG = {
  sectors: { government: "Government", ngo: "NGO" },
  sector_roles: { government: { analyst: "Analyst" }, ngo: {} },
  countries: { BR: "Brazil", KE: "Kenya" },
  languages: { pt: "Português", en: "English" },
  gis_expertise_levels: {},
  topics: { fires: "Fires" },
};

const GFW_PREFILL = {
  found: true,
  source: "gfw",
  suggestion: {
    first_name: "Maria",
    last_name: "Silva",
    sector_code: "government",
    role_code: "analyst",
    country_code: "BR",
  },
};

const SAVED_USER = {
  id: "u-1",
  email: "maria@example.org",
  name: "Maria da Silva",
  termsAccepted: true,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

interface Backend {
  prefill?: Response | (() => Response);
  configStatus?: number;
  patchStatus?: number;
}

function backend({
  prefill,
  configStatus = 200,
  patchStatus = 200,
}: Backend = {}) {
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    if (path === "/api/chat")
      return ndjsonResponse([agentTextLine("Pará lost 1.2 Mha.")]);
    if (path.startsWith("/api/threads/")) {
      return ndjsonResponse([
        humanLine("How much has Pará lost?"),
        agentTextLine("Pará lost 1.2 Mha."),
      ]);
    }
    if (path === "/api/profile/config") {
      return configStatus === 200 ? json(CONFIG) : json({}, configStatus);
    }
    if (path === "/api/auth/profile/prefill") {
      if (typeof prefill === "function") return prefill();
      return prefill ?? json({}, 404);
    }
    if (path === "/api/auth/profile" && init?.method === "PATCH") {
      // The backend answers with the updated user, profile now complete.
      return patchStatus === 200
        ? json({ ...SAVED_USER, hasProfile: true })
        : json({}, patchStatus);
    }
    throw new Error(`Unexpected request ${path}`);
  });
}

let storage: MemoryStorage;
let unwatch: () => void = () => {};

const cachedOptions = () =>
  queryClient.getQueryData(profileOptionsQuery.queryKey);
const cachedPrefill = () =>
  queryClient.getQueryData(profilePrefillQuery("u-1").queryKey);

const cards = () =>
  useChatStore.getState().messages.filter((m) => m.type === "profile-prompt");
const record = () => loadProfileAskRecord(storage, "u-1");
const seed = (r: Partial<ProfileAskRecord>) =>
  saveProfileAskRecord(storage, "u-1", { ...record(), ...r });

/** Lets queued microtasks and fetches settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function signIn(hasProfile = false) {
  useAuthStore.getState().setAuthStatus({
    email: "maria@example.org",
    id: "u-1",
    hasProfile,
    userType: null,
    name: "Maria da Silva",
    termsAccepted: true,
  });
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(submitOrttoProfile).mockReset();
  vi.mocked(trackEvent).mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  queryClient.clear();
  useChatStore.getState().reset();
  useProfileNudgeStore.getState().closeBanner();
  useAuthStore.getState().clearAuth();
  signIn();
  storage = new MemoryStorage();
  unwatch = watchAnswerCompletions(storage);
});

afterEach(() => {
  unwatch();
  vi.restoreAllMocks();
});

// ── Asking after an answer ────────────────────────────────────────────────

describe("the profile card after the first answer", () => {
  it("appears once, right after the first live answer", async () => {
    backend();
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));

    const messages = useChatStore.getState().messages;
    expect(messages.at(-2)?.type).toBe("assistant");
    expect(messages.at(-1)).toMatchObject({
      type: "profile-prompt",
      transient: true,
    });
    // The card carries no data: what it shows is settled in the query cache.
    expect(cachedOptions()).toEqual({
      sectors: CONFIG.sectors,
      sector_roles: CONFIG.sector_roles,
      countries: CONFIG.countries,
      languages: CONFIG.languages,
      topics: CONFIG.topics,
    });
    expect(cachedPrefill()).toEqual({ found: false });
    expect(record()).toEqual({
      lifetimeAnswers: 1,
      cardShown: true,
      bannersShown: 0,
    });
  });

  it("carries the GFW suggestion and names when the backend finds a profile", async () => {
    backend({ prefill: json(GFW_PREFILL) });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));

    expect(cachedPrefill()).toMatchObject({
      suggestion: {
        sector_code: "government",
        role_code: "analyst",
        country_code: "BR",
      },
      firstName: "Maria",
      lastName: "Silva",
    });
  });

  it("shows an empty card when the GFW lookup fails", async () => {
    backend({
      prefill: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));
    // Cached as "not found", so the card reads an empty prefill at once.
    expect(cachedPrefill()).toEqual({ found: false });
  });

  it("doesn't come back after the second answer (and the first card went on send)", async () => {
    backend();
    await useChatStore.getState().sendMessage("one");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));

    await useChatStore.getState().sendMessage("two");
    await settle();
    expect(cards()).toHaveLength(0);
    expect(useProfileNudgeStore.getState().bannerOpen).toBe(false);
    expect(record().lifetimeAnswers).toBe(2);
  });

  it("never appears when a thread is replayed, and replay doesn't count answers", async () => {
    backend();
    await useChatStore.getState().fetchThread("t-1");
    await settle();

    expect(
      useChatStore.getState().messages.some((m) => m.type === "assistant")
    ).toBe(true);
    expect(cards()).toHaveLength(0);
    expect(record().lifetimeAnswers).toBe(0);
  });

  it("does nothing for someone who already has a profile", async () => {
    signIn(true);
    backend();
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    expect(cards()).toHaveLength(0);
    expect(storage.length).toBe(0);
  });

  it("stays out of a conversation that moved on while the card loaded", async () => {
    backend();
    useChatStore.setState({ currentThreadId: "t-1" });
    const promise = handleAnswerCompleted(storage);
    // "New conversation" while the card's data is loading.
    useChatStore.getState().reset();
    await promise;
    expect(cards()).toHaveLength(0);
    expect(record().cardShown).toBe(false);
  });

  it("doesn't count the ask when the profile options can't load", async () => {
    backend({ configStatus: 503 });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    await settle();
    expect(cards()).toHaveLength(0);
    expect(record()).toMatchObject({ lifetimeAnswers: 1, cardShown: false });
  });
});

describe("showProfilePrompt", () => {
  it("keeps a single card", async () => {
    backend();
    await showProfilePrompt();
    await showProfilePrompt();
    expect(cards()).toHaveLength(1);
  });
});

// ── Not now / Save ────────────────────────────────────────────────────────

describe("Not now", () => {
  it("removes the card", async () => {
    backend();
    await showProfilePrompt();
    dismissProfileAsk(cards()[0].id);
    expect(cards()).toHaveLength(0);
  });
});

describe("Save", () => {
  const patch = {
    sector_code: "government",
    role_code: "analyst",
    country_code: "BR",
    company_organization: "State environment agency",
    help_test_features: false,
    receive_news_emails: false,
    has_profile: true as const,
  };

  it("PATCHes the card's partial profile, completes the profile, removes the card and tells Ortto", async () => {
    backend();
    await showProfilePrompt();
    const card = cards()[0];

    await saveProfileFromCard(card.id, patch, {
      found: true,
      lastName: "Silva",
    });

    const patchCall = vi
      .mocked(apiFetch)
      .mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patchCall![1]!.body as string)).toEqual(patch);
    expect(useAuthStore.getState().hasProfile).toBe(true);
    expect(cards()).toHaveLength(0);
    expect(submitOrttoProfile).toHaveBeenCalledWith({
      email: "maria@example.org",
      firstName: "Maria",
      lastName: "Silva",
      sector: "government",
      companyOrganization: "State environment agency",
      countryCode: "BR",
      Topics: undefined,
      receiveNewsEmails: false,
    });
  });

  it("sends the email opt-in, its names and topic labels to Ortto", async () => {
    backend();
    await showProfilePrompt();
    await saveProfileFromCard(cards()[0].id, {
      ...patch,
      receive_news_emails: true,
      first_name: "Mariana",
      last_name: "Souza",
      topics: ["fires"],
    });
    expect(submitOrttoProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Mariana",
        lastName: "Souza",
        Topics: ["Fires"],
        receiveNewsEmails: true,
      })
    );
  });

  it("splits the Resource Watch name for Ortto when GFW has none", async () => {
    backend();
    await showProfilePrompt();
    const card = cards()[0];
    await saveProfileFromCard(card.id, patch);
    expect(submitOrttoProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Maria", lastName: "da Silva" })
    );
  });

  it("keeps the card and the profile incomplete when the PATCH fails", async () => {
    backend({ patchStatus: 422 });
    await showProfilePrompt();
    const card = cards()[0];
    await expect(saveProfileFromCard(card.id, patch)).rejects.toThrow(
      "Failed to save profile (422)"
    );
    expect(cards()).toHaveLength(1);
    expect(useAuthStore.getState().hasProfile).toBe(false);
    expect(submitOrttoProfile).not.toHaveBeenCalled();
  });

  it("stops the asks once saved", async () => {
    backend();
    await showProfilePrompt();
    const card = cards()[0];
    await saveProfileFromCard(card.id, patch);

    seed({ lifetimeAnswers: 0 });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    expect(cards()).toHaveLength(0);
  });
});

// ── The later banner ──────────────────────────────────────────────────────

describe("the banner in the next new conversations", () => {
  const bannerOpen = () => useProfileNudgeStore.getState().bannerOpen;
  /** "New conversation", then a question in it. */
  const askInNewConversation = async (question: string) => {
    useChatStore.getState().reset();
    await useChatStore.getState().sendMessage(question);
  };

  beforeEach(() => {
    // The card was shown after the first answer and not saved.
    seed({ lifetimeAnswers: 1, cardShown: true });
  });

  it("opens after the first answer of a new conversation and records it", async () => {
    backend();
    await askInNewConversation("Second conversation");
    await vi.waitFor(() => expect(bannerOpen()).toBe(true));
    expect(cards()).toHaveLength(0);
    expect(record()).toMatchObject({ lifetimeAnswers: 2, bannersShown: 1 });
  });

  it("doesn't open for later answers in the same conversation", async () => {
    backend();
    await askInNewConversation("Second conversation");
    await vi.waitFor(() => expect(bannerOpen()).toBe(true));
    dismissProfileBanner();

    await useChatStore.getState().sendMessage("A follow-up");
    await settle();
    expect(bannerOpen()).toBe(false);
    expect(record().bannersShown).toBe(1);
  });

  it("closes when the conversation is left", async () => {
    backend();
    await askInNewConversation("Second conversation");
    await vi.waitFor(() => expect(bannerOpen()).toBe(true));
    useChatStore.getState().reset();
    expect(bannerOpen()).toBe(false);
  });

  it("stops after two conversations", async () => {
    backend();
    await askInNewConversation("Second conversation");
    await vi.waitFor(() => expect(bannerOpen()).toBe(true));
    await askInNewConversation("Third conversation");
    await vi.waitFor(() => expect(record().bannersShown).toBe(2));
    expect(bannerOpen()).toBe(true);

    await askInNewConversation("Fourth conversation");
    await settle();
    expect(bannerOpen()).toBe(false);
    expect(record().bannersShown).toBe(2);
  });

  it("Add details adds the card and closes the banner", async () => {
    backend();
    useProfileNudgeStore.getState().openBanner();
    await openProfileCardFromBanner();
    expect(cards()).toHaveLength(1);
    expect(bannerOpen()).toBe(false);
  });

  it("closes when the profile is saved from the card", async () => {
    backend();
    await showProfilePrompt();
    useProfileNudgeStore.getState().openBanner();
    const card = cards()[0];
    await saveProfileFromCard(card.id, {
      sector_code: "ngo",
      role_code: null,
      country_code: "KE",
      company_organization: "Kenya Forest Service",
      help_test_features: false,
      receive_news_emails: false,
      has_profile: true,
    });
    expect(bannerOpen()).toBe(false);
  });
});

// ── Analytics ─────────────────────────────────────────────────────────────

describe("analytics events", () => {
  const events = () => vi.mocked(trackEvent).mock.calls.map(([e]) => e);

  it("reports the card shown after the first answer, and whether it was prefilled", async () => {
    backend({ prefill: json(GFW_PREFILL) });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));
    expect(events()).toEqual([
      { event: "profile_card_shown", trigger: "first_answer", prefilled: true },
    ]);
  });

  it("reports the card shown from the banner", async () => {
    backend();
    await openProfileCardFromBanner();
    expect(events()).toEqual([
      { event: "profile_card_shown", trigger: "banner", prefilled: false },
    ]);
  });

  it("reports dismissals by surface", async () => {
    backend();
    await showProfilePrompt();
    vi.mocked(trackEvent).mockReset();
    dismissProfileAsk(cards()[0].id);
    dismissProfileBanner();
    expect(events()).toEqual([
      { event: "profile_card_dismissed", surface: "card" },
      { event: "profile_card_dismissed", surface: "banner" },
    ]);
  });

  it("reports a save, not a failed one", async () => {
    backend({ patchStatus: 500 });
    await showProfilePrompt();
    vi.mocked(trackEvent).mockReset();
    const card = cards()[0];
    const patch = {
      sector_code: "ngo",
      role_code: null,
      country_code: "KE",
      company_organization: "Kenya Forest Service",
      help_test_features: false,
      receive_news_emails: false,
      has_profile: true as const,
    };
    await expect(saveProfileFromCard(card.id, patch)).rejects.toThrow();
    expect(events()).toEqual([]);

    backend();
    await saveProfileFromCard(card.id, patch);
    expect(events()).toEqual([
      { event: "profile_card_saved", prefilled: false, news_emails: false },
    ]);
  });
});
