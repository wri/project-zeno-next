import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ORTTO_GNW_FORM_URL, submitOrttoProfile } from "../ortto";

describe("submitOrttoProfile", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the onboarding form's submission byte for byte as before", async () => {
    await submitOrttoProfile({
      email: "maria@example.org",
      firstName: "Maria",
      lastName: "Silva",
      sector: "government",
      jobTitle: "",
      companyOrganization: "State environment agency",
      countryCode: "BR",
      Topics: ["Forests", "Biodiversity"],
      receiveNewsEmails: false,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ortto.wri.org/custom-forms/gnw/");
    expect(url).toBe(ORTTO_GNW_FORM_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    // The exact string the old onboarding form's inline fetch sent.
    expect(init.body).toBe(
      '{"email":"maria@example.org","firstName":"Maria","lastName":"Silva",' +
        '"sector":"government","jobTitle":"","companyOrganization":"State environment agency",' +
        '"countryCode":"BR","Topics":["Forests","Biodiversity"],"receiveNewsEmails":false}'
    );
  });

  it("keeps the same key order whatever order the caller uses", async () => {
    await submitOrttoProfile({
      receiveNewsEmails: true,
      countryCode: "KE",
      email: "amina@example.org",
      sector: "ngo",
    });
    expect(Object.keys(JSON.parse(fetchMock.mock.calls[0][1].body))).toEqual([
      "email",
      "sector",
      "countryCode",
      "receiveNewsEmails",
    ]);
  });

  it("omits keys that are undefined, so a partial submission only sends what it knows", async () => {
    await submitOrttoProfile({
      email: "amina@example.org",
      sector: "ngo",
      countryCode: "KE",
    });
    expect(fetchMock.mock.calls[0][1].body).toBe(
      '{"email":"amina@example.org","sector":"ngo","countryCode":"KE"}'
    );
  });

  it("logs the status of a failed submission and resolves", async () => {
    fetchMock.mockResolvedValue({ status: 500, ok: false });
    await expect(
      submitOrttoProfile({ email: "a@example.org" })
    ).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(
      "[Client] Ortto submission status:",
      500,
      "FAILED"
    );
  });

  it("never throws when the request itself fails", async () => {
    const error = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(error);
    await expect(
      submitOrttoProfile({ email: "a@example.org" })
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "[Client] Ortto submission error:",
      error
    );
  });
});
