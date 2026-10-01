import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import { fetchProfileCardOptions, patchProfile } from "../profile";

const CONFIG = {
  sectors: { government: "Government" },
  sector_roles: { government: { analyst: "Analyst" } },
  countries: { BR: "Brazil" },
  languages: { pt: "Português" },
  gis_expertise_levels: { none: "No experience" },
  topics: { forests: "Forests" },
};

describe("patchProfile", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("PATCHes the snake_case partial body and returns the parsed user", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "u-1",
          email: "maria@example.org",
          hasProfile: false,
          termsAccepted: true,
        }),
        { status: 200 }
      )
    );
    const { status, usage } = await patchProfile({
      terms_version: "2026-09-30",
    });
    expect(status).toMatchObject({
      id: "u-1",
      hasProfile: false,
      termsAccepted: true,
    });
    expect(usage).toBeNull();

    const [path, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe("/api/auth/profile");
    expect(init?.method).toBe("PATCH");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(init?.body).toBe('{"terms_version":"2026-09-30"}');
  });

  it("throws on a non-2xx, naming the status", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response("", { status: 422 }));
    await expect(
      patchProfile({ sector_code: "government", has_profile: true })
    ).rejects.toThrow("Failed to save profile (422)");
  });

  it("refuses an invalid body before calling the API", async () => {
    await expect(patchProfile({ terms_version: "" })).rejects.toThrow();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe("fetchProfileCardOptions", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("returns only the lists the card uses", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify(CONFIG), { status: 200 })
    );
    await expect(fetchProfileCardOptions()).resolves.toEqual({
      sectors: CONFIG.sectors,
      sector_roles: CONFIG.sector_roles,
      countries: CONFIG.countries,
      languages: CONFIG.languages,
    });
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe("/api/profile/config");
  });

  it("throws on a non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response("", { status: 503 }));
    await expect(fetchProfileCardOptions()).rejects.toThrow(/503/);
  });
});
