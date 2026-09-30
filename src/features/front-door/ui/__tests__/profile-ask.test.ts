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
vi.mock("@/app/lib/ortto", () => ({ submitOrttoProfile: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import { submitOrttoProfile } from "@/app/lib/ortto";
import { queryClient } from "@/app/lib/query-client";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import {
  loadProfileAskRecord,
  saveProfileAskRecord,
  type ProfileAskStorages,
} from "../../lib/profile-ask-storage";
import type { ProfileAskRecord } from "../../model/profile-ask";
import useProfileNudgeStore from "../../model/profile-nudge-store";
import {
  dismissProfileAsk,
  dismissProfileBanner,
  handleAnswerCompleted,
  openProfileCardFromBanner,
  saveProfileFromCard,
  showProfilePrompt,
  watchAnswerCompletions,
  type ProfileAskDeps,
} from "../profile-ask";

// ── Fixtures ──────────────────────────────────────────────────────────────

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const CONFIG = {
  sectors: { government: "Government", ngo: "NGO" },
  sector_roles: { government: { analyst: "Analyst" }, ngo: {} },
  countries: { BR: "Brazil", KE: "Kenya" },
  languages: { pt: "Português", en: "English" },
  gis_expertise_levels: {},
  topics: {},
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

function aiLine(text: string): string {
  return JSON.stringify({
    node: "agent",
    timestamp: "2026-09-30T10:00:01.000Z",
    update: JSON.stringify({
      messages: [
        {
          lc: 1,
          type: "constructor",
          id: ["x"],
          kwargs: {
            content: text,
            type: "ai",
            id: "m-ai",
            response_metadata: {},
            tool_calls: [],
            invalid_tool_calls: [],
          },
        },
      ],
    }),
  });
}

function humanLine(text: string): string {
  return JSON.stringify({
    node: "agent",
    timestamp: "2026-09-30T10:00:00.000Z",
    update: JSON.stringify({
      messages: [
        {
          lc: 1,
          type: "constructor",
          id: ["x"],
          kwargs: { content: text, type: "human", id: "m-human" },
        },
      ],
    }),
  });
}

function ndjson(lines: string[]): Response {
  const encoder = new TextEncoder();
  let delivered = false;
  const reader = {
    read: () => {
      if (delivered) return Promise.resolve({ done: true, value: undefined });
      delivered = true;
      return Promise.resolve({
        done: false,
        value: encoder.encode(lines.join("\n") + "\n"),
      });
    },
    releaseLock: () => {},
    cancel: () => Promise.resolve(),
  };
  return {
    ok: true,
    headers: new Headers(),
    body: { getReader: () => reader },
  } as unknown as Response;
}

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
    if (path === "/api/chat") return ndjson([aiLine("Pará lost 1.2 Mha.")]);
    if (path.startsWith("/api/threads/")) {
      return ndjson([
        humanLine("How much has Pará lost?"),
        aiLine("Pará lost 1.2 Mha."),
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
      return json({}, patchStatus);
    }
    throw new Error(`Unexpected request ${path}`);
  });
}

let storages: { local: MemoryStorage; session: MemoryStorage };
let deps: ProfileAskDeps;
let unwatch: () => void = () => {};

const cards = () =>
  useChatStore.getState().messages.filter((m) => m.type === "profile-prompt");
const record = () =>
  loadProfileAskRecord(storages as ProfileAskStorages, "u-1");
const seed = (r: Partial<ProfileAskRecord>) =>
  saveProfileAskRecord(storages, "u-1", { ...record(), ...r });

/** Lets queued microtasks and fetches settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function signIn(hasProfile = false) {
  useAuthStore.getState().setAuthStatus({
    email: "maria@example.org",
    id: "u-1",
    hasProfile,
    userType: null,
    name: "Maria da Silva",
    termsAcceptedAt: "2026-09-30T09:00:00Z",
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", "true");
  vi.mocked(apiFetch).mockReset();
  vi.mocked(submitOrttoProfile).mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  queryClient.clear();
  useChatStore.getState().reset();
  useProfileNudgeStore.getState().closeBanner();
  useAuthStore.getState().clearAuth();
  signIn();
  storages = { local: new MemoryStorage(), session: new MemoryStorage() };
  deps = { storages: () => storages };
  unwatch = watchAnswerCompletions(deps);
});

afterEach(() => {
  unwatch();
  vi.unstubAllEnvs();
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
    expect(messages.at(-1)?.type).toBe("profile-prompt");
    expect(messages.at(-1)?.profilePrompt).toEqual({
      options: {
        sectors: CONFIG.sectors,
        sector_roles: CONFIG.sector_roles,
        countries: CONFIG.countries,
        languages: CONFIG.languages,
      },
    });
    expect(record()).toEqual({
      dismissals: 0,
      lifetimeAnswers: 1,
      askedThisSession: true,
      sessionAnswers: 1,
    });
  });

  it("carries the GFW suggestion and names when the backend finds a profile", async () => {
    backend({ prefill: json(GFW_PREFILL) });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));

    expect(cards()[0].profilePrompt).toMatchObject({
      suggestion: {
        source: "gfw",
        sector: "government",
        role: "analyst",
        country: "BR",
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
    expect(cards()[0].profilePrompt?.suggestion).toBeUndefined();
  });

  it("doesn't come back after the second answer (and the first card went on send)", async () => {
    backend();
    await useChatStore.getState().sendMessage("one");
    await vi.waitFor(() => expect(cards()).toHaveLength(1));

    await useChatStore.getState().sendMessage("two");
    await settle();
    expect(cards()).toHaveLength(0);
    expect(record().lifetimeAnswers).toBe(2);
    expect(record().dismissals).toBe(0);
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

  it("does nothing with the flag off (no card, nothing stored)", async () => {
    vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", "false");
    backend();
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();

    expect(cards()).toHaveLength(0);
    expect(storages.local.length).toBe(0);
    expect(storages.session.length).toBe(0);
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(([path]) => path === "/api/profile/config")
    ).toBe(false);
  });

  it("does nothing for someone who already has a profile", async () => {
    signIn(true);
    backend();
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    expect(cards()).toHaveLength(0);
    expect(storages.local.length).toBe(0);
  });

  it("doesn't ask again after three Not nows", async () => {
    seed({ dismissals: 3 });
    backend();
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    expect(cards()).toHaveLength(0);
  });

  it("stays out of a conversation that moved on while the card loaded", async () => {
    backend();
    useChatStore.setState({ currentThreadId: "t-1" });
    const promise = handleAnswerCompleted(deps);
    // "New conversation" while the card's data is loading.
    useChatStore.getState().reset();
    await promise;
    expect(cards()).toHaveLength(0);
    expect(record().askedThisSession).toBe(false);
  });

  it("doesn't count the ask when the profile options can't load", async () => {
    backend({ configStatus: 503 });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    await settle();
    expect(cards()).toHaveLength(0);
    expect(record()).toMatchObject({
      lifetimeAnswers: 1,
      askedThisSession: false,
    });
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
  it("records a dismissal and removes the card", async () => {
    backend();
    await showProfilePrompt();
    dismissProfileAsk(cards()[0].id, deps);
    expect(cards()).toHaveLength(0);
    expect(record().dismissals).toBe(1);
  });
});

describe("Save", () => {
  const patch = {
    sector_code: "government",
    role_code: "analyst",
    country_code: "BR",
    has_profile: true as const,
  };

  it("PATCHes the card's partial profile, completes the profile, removes the card and tells Ortto", async () => {
    backend();
    await showProfilePrompt();
    const card = cards()[0];

    await saveProfileFromCard(
      card.id,
      { ...card.profilePrompt!, lastName: "Silva" },
      patch
    );

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
      companyOrganization: undefined,
      countryCode: "BR",
    });
    // The card asks for no consent, so it never opts anyone in to news.
    expect(vi.mocked(submitOrttoProfile).mock.calls[0][0]).not.toHaveProperty(
      "receiveNewsEmails"
    );
  });

  it("splits the Resource Watch name for Ortto when GFW has none", async () => {
    backend();
    await showProfilePrompt();
    const card = cards()[0];
    await saveProfileFromCard(card.id, card.profilePrompt!, patch);
    expect(submitOrttoProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Maria", lastName: "da Silva" })
    );
  });

  it("keeps the card and the profile incomplete when the PATCH fails", async () => {
    backend({ patchStatus: 422 });
    await showProfilePrompt();
    const card = cards()[0];
    await expect(
      saveProfileFromCard(card.id, card.profilePrompt!, patch)
    ).rejects.toMatchObject({ status: 422 });
    expect(cards()).toHaveLength(1);
    expect(useAuthStore.getState().hasProfile).toBe(false);
    expect(submitOrttoProfile).not.toHaveBeenCalled();
  });

  it("stops the asks once saved", async () => {
    backend();
    await showProfilePrompt();
    const card = cards()[0];
    await saveProfileFromCard(card.id, card.profilePrompt!, patch);

    seed({ lifetimeAnswers: 0 });
    await useChatStore.getState().sendMessage("How much has Pará lost?");
    await settle();
    expect(cards()).toHaveLength(0);
  });
});

// ── The later banner ──────────────────────────────────────────────────────

describe("the banner at the session's fifth answer", () => {
  const bannerOpen = () => useProfileNudgeStore.getState().bannerOpen;
  // A later session: the first-answer card was dismissed long ago.
  const laterSession = {
    dismissals: 1,
    lifetimeAnswers: 12,
    sessionAnswers: 4,
  };

  it("opens after the fifth answer of a session and records the ask", async () => {
    seed(laterSession);
    backend();
    await useChatStore.getState().sendMessage("Fifth question");
    await vi.waitFor(() => expect(bannerOpen()).toBe(true));
    expect(cards()).toHaveLength(0);
    expect(record()).toMatchObject({
      sessionAnswers: 5,
      askedThisSession: true,
    });
  });

  it("stays closed before the fifth answer", async () => {
    seed({ ...laterSession, sessionAnswers: 2 });
    backend();
    await useChatStore.getState().sendMessage("Third question");
    await settle();
    expect(bannerOpen()).toBe(false);
  });

  it("stays closed if the session already asked (the first-answer card)", async () => {
    seed({ ...laterSession, askedThisSession: true });
    backend();
    await useChatStore.getState().sendMessage("Fifth question");
    await settle();
    expect(bannerOpen()).toBe(false);
  });

  it("Add details adds the card and closes the banner", async () => {
    backend();
    useProfileNudgeStore.getState().openBanner();
    await openProfileCardFromBanner();
    expect(cards()).toHaveLength(1);
    expect(bannerOpen()).toBe(false);
  });

  it("closing it counts as a Not now", () => {
    useProfileNudgeStore.getState().openBanner();
    dismissProfileBanner(deps);
    expect(bannerOpen()).toBe(false);
    expect(record().dismissals).toBe(1);
  });

  it("closes when the profile is saved from the card", async () => {
    backend();
    await showProfilePrompt();
    useProfileNudgeStore.getState().openBanner();
    const card = cards()[0];
    await saveProfileFromCard(card.id, card.profilePrompt!, {
      sector_code: "ngo",
      role_code: null,
      country_code: "KE",
      has_profile: true,
    });
    expect(bannerOpen()).toBe(false);
  });
});
