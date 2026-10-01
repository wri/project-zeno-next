import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import {
  fetchProfilePrefill,
  toProfilePrefill,
  type ProfilePrefillResponseWire,
} from "../profile-prefill";

const FULL: ProfilePrefillResponseWire = {
  found: true,
  source: "gfw",
  suggestion: {
    first_name: "Maria",
    last_name: "Silva",
    job_title: "Analyst",
    company_organization: "State environment agency",
    sector_code: "government",
    role_code: "analyst",
    country_code: "BR",
    preferred_language_code: "pt",
    topics: ["forests"],
  },
};

describe("toProfilePrefill", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a full GFW profile to the card's suggestion, plus names for Ortto", () => {
    expect(toProfilePrefill(FULL)).toEqual({
      found: true,
      // The PATCH field names, as on the wire; no `source`.
      suggestion: {
        company_organization: "State environment agency",
        sector_code: "government",
        role_code: "analyst",
        country_code: "BR",
        preferred_language_code: "pt",
      },
      firstName: "Maria",
      lastName: "Silva",
    });
  });

  it("drops job title and topics, which the card doesn't use yet", () => {
    const prefill = toProfilePrefill(FULL);
    expect(JSON.stringify(prefill)).not.toContain("Analyst");
    expect(JSON.stringify(prefill)).not.toContain("forests");
  });

  it("never carries a consent flag, even if one appears on the wire", () => {
    const prefill = toProfilePrefill({
      ...FULL,
      suggestion: {
        ...FULL.suggestion,
        receive_news_emails: true,
        help_test_features: true,
      },
    });
    expect(JSON.stringify(prefill)).not.toMatch(/news|test/i);
  });

  it("reads no profile as not found", () => {
    expect(
      toProfilePrefill({ found: false, source: null, suggestion: null })
    ).toEqual({ found: false });
  });

  it("keeps found but no suggestion when nothing the card shows was mapped", () => {
    expect(
      toProfilePrefill({
        found: true,
        source: "gfw",
        suggestion: { last_name: "Rivera", job_title: "Ranger" },
      })
    ).toEqual({ found: true, lastName: "Rivera" });
    expect(
      toProfilePrefill({ found: true, source: "gfw", suggestion: {} })
    ).toEqual({ found: true });
  });

  it("treats blank strings as absent", () => {
    expect(
      toProfilePrefill({
        found: true,
        source: "gfw",
        suggestion: {
          company_organization: "  ",
          sector_code: "ngo",
          first_name: "",
        },
      })
    ).toEqual({ found: true, suggestion: { sector_code: "ngo" } });
  });

  it("treats a null value as absent, with a warning", () => {
    expect(
      toProfilePrefill({
        found: true,
        source: "gfw",
        suggestion: { sector_code: "ngo", country_code: null },
      })
    ).toEqual({ found: true, suggestion: { sector_code: "ngo" } });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("country_code")
    );
  });

  it("treats a wrongly typed value as absent, with a warning", () => {
    expect(
      toProfilePrefill({
        found: true,
        source: "gfw",
        suggestion: { sector_code: 3, country_code: "KE" },
      })
    ).toEqual({ found: true, suggestion: { country_code: "KE" } });
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("reads found with a null suggestion as found, nothing to prefill", () => {
    expect(
      toProfilePrefill({ found: true, source: "gfw", suggestion: null })
    ).toEqual({ found: true });
  });

  it.each([
    ["not an object", "nope"],
    ["null", null],
    ["an array", []],
    ["found missing", { source: null, suggestion: null }],
    ["found not a boolean", { found: "yes", source: "gfw", suggestion: {} }],
    ["suggestion missing", { found: true, source: "gfw" }],
    ["suggestion a string", { found: true, source: "gfw", suggestion: "x" }],
    ["suggestion an array", { found: true, source: "gfw", suggestion: [] }],
  ])("throws on a structurally malformed payload: %s", (_label, raw) => {
    expect(() => toProfilePrefill(raw)).toThrow(/Profile prefill/);
  });
});

describe("fetchProfilePrefill", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("parses a 200 response", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify(FULL), { status: 200 })
    );
    const prefill = await fetchProfilePrefill();
    expect(prefill.found).toBe(true);
    expect(prefill.suggestion?.sector_code).toBe("government");
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe(
      "/api/auth/profile/prefill"
    );
  });

  it.each([404, 422, 500])(
    "reads a %i as not found (the endpoint may not exist yet)",
    async (status) => {
      vi.mocked(apiFetch).mockResolvedValue(new Response("", { status }));
      await expect(fetchProfilePrefill()).resolves.toEqual({ found: false });
    }
  );

  it("lets a network error through, for the caller to handle", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchProfilePrefill()).rejects.toThrow("Failed to fetch");
  });
});
