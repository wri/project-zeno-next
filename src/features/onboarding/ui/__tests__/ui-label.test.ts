import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { i18n } from "@/src/shared/lib/i18n";

import { UiLabel, uiLabelText } from "../ui-label";

const render = (i18nKey: "chat.header.title" | "chat.input.analyses") =>
  renderToStaticMarkup(createElement(UiLabel, { i18nKey }));

describe("UI labels from the i18n catalog", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("names the control as the app shows it in English", () => {
    expect(uiLabelText("chat.header.title")).toBe("AI Assistant");
    expect(render("chat.header.title")).toBe("AI Assistant");
    expect(render("chat.input.analyses")).toBe("Analyses");
  });

  it("follows the UI locale at the moment it is read", async () => {
    await i18n.changeLanguage("es");
    const spanish = i18n.getResource("es", "translation", "chat.header.title");
    expect(spanish).not.toBe("AI Assistant");
    expect(uiLabelText("chat.header.title")).toBe(spanish);
    expect(render("chat.header.title")).toBe(spanish);
  });
});
