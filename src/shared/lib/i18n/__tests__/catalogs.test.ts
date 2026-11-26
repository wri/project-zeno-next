import {
  parse,
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import { catalogs } from "../catalogs";
import type { i18n as I18n } from "i18next";
import { createI18n } from "../i18n";
import { LOCALES } from "../locale";

const en = catalogs.en;

/**
 * Every ICU argument name and `<tag>` in a message, nested plural/select
 * branches and tag children included.
 */
function argumentNames(elements: MessageFormatElement[]): string[] {
  return elements.flatMap((element) => {
    if (element.type === TYPE.literal || element.type === TYPE.pound) return [];
    if (element.type === TYPE.tag)
      return [`<${element.value}>`, ...argumentNames(element.children)];
    const nested =
      element.type === TYPE.plural || element.type === TYPE.select
        ? Object.values(element.options).flatMap((o) => argumentNames(o.value))
        : [];
    return [element.value, ...nested];
  });
}

/** `t` for keys added at run time, which the catalog types don't know. */
const untypedT = (i18n: I18n) =>
  i18n.t as unknown as (key: string, options?: object) => string;

const names = (message: string) =>
  [...new Set(argumentNames(parse(message)))].sort();

describe.each(LOCALES)("%s catalog", (locale) => {
  const catalog: Record<string, string> = catalogs[locale];

  it("has exactly the keys in en.json", () => {
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty messages", () => {
    for (const [key, message] of Object.entries(catalog)) {
      expect(message.trim(), key).not.toBe("");
    }
  });

  it("keeps the English placeholders and tags in every message", () => {
    for (const [key, message] of Object.entries(catalog)) {
      expect(names(message), key).toEqual(names(en[key as keyof typeof en]));
    }
  });
});

describe("createI18n", () => {
  it("renders the active locale", () => {
    expect(createI18n("pt").t("chat.input.sending")).toBe(
      catalogs.pt["chat.input.sending"]
    );
  });

  it("falls back to English for a key the active catalog lacks", () => {
    const i18n = createI18n("en");
    i18n.addResource("en", "translation", "test.onlyInEnglish", "Only English");
    i18n.changeLanguage("zh");
    expect(untypedT(i18n)("test.onlyInEnglish")).toBe("Only English");
  });

  it("formats ICU plurals with an exact =0 branch ahead of pt's one category", () => {
    const i18n = createI18n("pt");
    i18n.addResource(
      "pt",
      "translation",
      "test.count",
      "{count, plural, =0 {Nenhuma área} one {# área} other {# áreas}}"
    );
    expect(untypedT(i18n)("test.count", { count: 0 })).toBe("Nenhuma área");
    expect(untypedT(i18n)("test.count", { count: 1 })).toBe("1 área");
    expect(untypedT(i18n)("test.count", { count: 3 })).toBe("3 áreas");
  });

  it("formats the prompt count and the unread-items badge, including a plural branch", () => {
    const en = createI18n("en");
    expect(en.t("prompts.count", { used: 15, total: 20 })).toBe(
      "15 / 20 daily prompts"
    );
    expect(en.t("sidebar.whatsNew.badge", { count: 1 })).toBe("1 item");
    expect(en.t("sidebar.whatsNew.badge", { count: 3 })).toBe("3 items");

    const es = createI18n("es");
    expect(es.t("sidebar.whatsNew.badge", { count: 1 })).toBe("1 elemento");
    expect(es.t("sidebar.whatsNew.badge", { count: 3 })).toBe("3 elementos");
  });

  it("interpolates placeholders without escaping them", () => {
    const i18n = createI18n("en");
    i18n.addResource("en", "translation", "test.name", "Hello {name}");
    expect(untypedT(i18n)("test.name", { name: "<Ana>" })).toBe("Hello <Ana>");
  });
});
