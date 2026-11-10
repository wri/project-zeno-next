import { describe, expect, it } from "vitest";
import { uiLocale } from "../uiLocale";

describe("uiLocale", () => {
  const spanish = { profile: "es", cookie: null, languages: ["fr"] };

  it.each(["/app", "/app/threads/abc", "/dashboards/1", "/welcome"])(
    "resolves the user's locale on %s",
    (pathname) => {
      expect(uiLocale(pathname, spanish)).toBe("es");
    }
  );

  // The prerendered landing pages stay English in phase 1.
  it.each(["/", "/amazonia", "/amazonia/"])(
    "keeps %s in English",
    (pathname) => {
      expect(uiLocale(pathname, spanish)).toBe("en");
    }
  );
});
