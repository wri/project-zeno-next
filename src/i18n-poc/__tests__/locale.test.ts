import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  localeCookieAssignment,
  localeFromCookieHeader,
  localeFromLanguages,
  LOCALE_COOKIE,
  matchLocale,
  resolveLocale,
} from "../locale";

describe("locale resolution", () => {
  it("reads an explicit cookie and ignores the path", () => {
    expect(
      localeFromCookieHeader(`other=1; ${LOCALE_COOKIE}=zh-Hans; theme=light`)
    ).toBe("zh-Hans");
  });

  it("maps browser tags onto catalogs we ship", () => {
    expect(matchLocale("zh-CN")).toBe("zh-Hans");
    expect(matchLocale("zh-TW")).toBeNull();
    expect(matchLocale("pt")).toBe("pt-BR");
    expect(matchLocale("pt-PT")).toBe("pt-BR");
    expect(localeFromLanguages(["de-DE", "pt-BR", "en"])).toBe("pt-BR");
  });

  it("prefers an explicit choice, then the cookie, then the browser, then English", () => {
    expect(
      resolveLocale({
        explicit: "pt-BR",
        cookie: `${LOCALE_COOKIE}=zh-Hans`,
        languages: ["en"],
      })
    ).toBe("pt-BR");
    expect(
      resolveLocale({
        cookie: `${LOCALE_COOKIE}=zh-Hans`,
        languages: ["en"],
      })
    ).toBe("zh-Hans");
    expect(resolveLocale({ languages: ["de", "en-GB"] })).toBe("en");
    expect(resolveLocale({})).toBe("en");
  });

  it("writes a cookie assignment with no path prefix", () => {
    const assignment = localeCookieAssignment("pt-BR");
    expect(assignment.startsWith(`${LOCALE_COOKIE}=pt-BR`)).toBe(true);
    expect(assignment).toContain("Path=/");
    expect(assignment).not.toContain("i18n-poc");
  });
});

describe("i18n module isolation", () => {
  it("does not import Next.js or the app router", () => {
    const root = join(process.cwd(), "src/i18n-poc");
    const files = walk(root).filter(
      (file) => file.endsWith(".ts") || file.endsWith(".tsx")
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/from ["']next(\/|["'])/);
      expect(source, file).not.toMatch(/from ["']react-router["']/);
      expect(source, file).not.toMatch(/from ["']next\/navigation["']/);
    }
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return [path];
  });
}
