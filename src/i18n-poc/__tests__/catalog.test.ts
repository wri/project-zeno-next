import { describe, expect, it } from "vitest";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { setupI18n } from "@lingui/core";
import { catalogs, SAMPLE_AREA, SAMPLE_DATE, welcomeCopy } from "../catalog";
import type { Locale } from "../locale";
import {
  createI18next,
  translateWith as i18nextTranslate,
} from "../i18next/instance";
import {
  createLingui,
  translateWith as linguiTranslate,
} from "../lingui/instance";

const LOCALES: Locale[] = ["en", "pt-BR", "zh-Hans"];

describe("shared ICU catalogs", () => {
  it("keeps the same keys in every locale", () => {
    const keys = Object.keys(catalogs.en).sort();
    expect(Object.keys(catalogs["pt-BR"]).sort()).toEqual(keys);
    expect(Object.keys(catalogs["zh-Hans"]).sort()).toEqual(keys);
  });

  it("formats the welcome screen the same way in both engines", () => {
    for (const locale of LOCALES) {
      const i18nextCopy = welcomeCopy(
        i18nextTranslate(createI18next(locale), locale)
      );
      const linguiCopy = welcomeCopy(
        linguiTranslate(createLingui(locale), locale)
      );
      expect(linguiCopy, locale).toEqual(i18nextCopy);
      expect(i18nextCopy.welcome.length).toBeGreaterThan(0);
      expect(i18nextCopy.prompts).toHaveLength(3);
    }
  });

  it("applies plural rules for Brazilian Portuguese and Chinese", () => {
    const pt = i18nextTranslate(createI18next("pt-BR"), "pt-BR");
    const zh = i18nextTranslate(createI18next("zh-Hans"), "zh-Hans");
    // pt-BR's CLDR `one` also covers 0; the exact `=0` branch must win.
    expect(pt("assistant.promptCount", { count: 0 })).toBe(
      "Nenhuma sugestão de pergunta"
    );
    expect(pt("assistant.promptCount", { count: 1 })).toBe(
      "1 sugestão de pergunta"
    );
    expect(pt("assistant.promptCount", { count: 3 })).toBe(
      "3 sugestões de pergunta"
    );
    expect(zh("assistant.promptCount", { count: 1 })).toBe("1 条建议提问");
    expect(zh("assistant.promptCount", { count: 3 })).toBe("3 条建议提问");
  });

  it("renders a plain number and a medium date in zh-Hans", () => {
    const copy = welcomeCopy(
      i18nextTranslate(createI18next("zh-Hans"), "zh-Hans")
    );
    expect(copy.sampleStat).toContain("公顷");
    expect(copy.sampleStat).not.toContain("{area");
    expect(copy.sampleStat).not.toContain("{when");
  });
});

describe("ICU number skeletons", () => {
  it("formats unit skeletons in i18next and rejects them in Lingui", () => {
    const message = "{area, number, ::unit/hectare}";
    const i18n = createI18next("en");
    i18n.addResource("en", "translation", "skeleton", message);
    expect(i18n.t("skeleton", { area: SAMPLE_AREA })).toMatch(/ha/);

    const lingui = setupI18n();
    lingui.setMessagesCompiler(compileMessage);
    lingui.load("en", { skeleton: message });
    lingui.activate("en");
    expect(() => lingui._("skeleton", { area: SAMPLE_AREA })).toThrow(
      /unit\/hectare/
    );
    expect(SAMPLE_DATE).toBeInstanceOf(Date);
  });
});
