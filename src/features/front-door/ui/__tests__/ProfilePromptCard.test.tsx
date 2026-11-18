// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ProfileCardOptions,
  ProfileSuggestion,
} from "../../model/profile-card";
import {
  ProfilePromptCard,
  type ProfilePromptCardProps,
} from "../ProfilePromptCard";

// React Router's Link needs a router; a plain anchor is enough here.
vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
}));

const options: ProfileCardOptions = {
  sectors: { government: "Government", ngo: "NGO / Non-profit" },
  countries: { BRA: "Brazil", KEN: "Kenya", PER: "Peru", PRT: "Portugal" },
  languages: { en: "English", pt: "Português" },
  topics: { fires: "Fires", water: "Water" },
};

const fullGfw: ProfileSuggestion = {
  company_organization: "State environment agency",
  sector_code: "government",
  country_code: "BRA",
  preferred_language_code: "pt",
};

function renderCard(props: Partial<ProfilePromptCardProps> = {}) {
  const onSave = vi.fn();
  const onDismiss = vi.fn();
  const { container, unmount } = render(
    <ChakraProvider value={defaultSystem}>
      <ProfilePromptCard
        options={options}
        onSave={onSave}
        onDismiss={onDismiss}
        {...props}
      />
    </ChakraProvider>
  );
  return { onSave, onDismiss, container, unmount };
}

/** The confirm-mode rows as [label, value] pairs, top to bottom. */
function confirmRows(container: HTMLElement): Array<[string, string]> {
  const terms = [...container.querySelectorAll("dt")];
  return terms.map((dt) => [
    dt.textContent ?? "",
    dt.nextElementSibling?.textContent ?? "",
  ]);
}

/** The fields-mode labels, top to bottom ("(Optional)" included). */
function fieldLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll("label")]
    .map((l) => l.textContent ?? "")
    .slice(0, FIELD_LABELS.length);
}

const FIELD_LABELS = [
  "Country",
  "Preferred language(Optional)",
  "Sector",
  "Organisation",
];

/** No email list or testing opt-in: what a Save without opt-ins adds. */
const NO_OPT_INS = { help_test_features: false, receive_news_emails: false };

function organisationInput(): HTMLInputElement {
  return screen.getByRole("textbox", {
    name: /^Organisation/,
  }) as HTMLInputElement;
}

function saveButton(name = "Save"): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

/** The searchable country or language field's text input. */
function comboInput(label: RegExp): HTMLInputElement {
  return screen.getByRole("combobox", { name: label }) as HTMLInputElement;
}

/**
 * Fire an event and let the combobox settle: its state machine updates the
 * list and the input in microtasks after the event.
 */
async function settle(fire: () => void) {
  await act(async () => fire());
}

/** Type into a searchable field, as a person would: focus, then input. */
async function typeInto(input: HTMLInputElement, text: string) {
  await settle(() => fireEvent.focus(input));
  await settle(() => fireEvent.change(input, { target: { value: text } }));
}

async function pick(option: string) {
  await settle(() =>
    fireEvent.click(screen.getByRole("option", { name: option }))
  );
}

async function press(input: HTMLInputElement, key: string) {
  await settle(() => fireEvent.keyDown(input, { key }));
}

/** The options of the open list, top to bottom. */
function openOptions(): string[] {
  return screen.queryAllByRole("option").map((o) => o.textContent ?? "");
}

const COUNTRY = /^Country/;
const LANGUAGE = /^Preferred language/;

describe("ProfilePromptCard", () => {
  it("confirms a full GFW profile in one click", () => {
    const { onSave, container } = renderCard({ suggestion: fullGfw });
    expect(
      screen.getByText("We found your Global Forest Watch profile")
    ).toBeTruthy();
    expect(confirmRows(container)).toEqual([
      ["Country", "Brazil"],
      ["Language", "Português"],
      ["Sector", "Government"],
      ["Organisation", "State environment agency"],
    ]);

    // No "Not now" on the one-click confirmation.
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(onSave).toHaveBeenCalledWith({
      sector_code: "government",
      country_code: "BRA",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      ...NO_OPT_INS,
      has_profile: true,
    });
  });

  it("leaves out confirm rows GFW had no value for", () => {
    const { preferred_language_code, ...rest } = fullGfw;
    void preferred_language_code;
    const { container } = renderCard({ suggestion: rest });
    expect(confirmRows(container)).toEqual([
      ["Country", "Brazil"],
      ["Sector", "Government"],
      ["Organisation", "State environment agency"],
    ]);
  });

  it("switches to the fields on Edit details, all prefilled", () => {
    const { onSave, container } = renderCard({ suggestion: fullGfw });
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByText("Check your details")).toBeTruthy();
    expect(fieldLabels(container)).toEqual(FIELD_LABELS);
    expect(comboInput(COUNTRY).value).toBe("Brazil");
    expect(comboInput(LANGUAGE).value).toBe("Português");
    expect(organisationInput().value).toBe("State environment agency");
    expect(screen.getByText("Government", { selector: "span" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      sector_code: "government",
      country_code: "BRA",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      ...NO_OPT_INS,
      has_profile: true,
    });
  });

  it("asks for country, language, sector and organisation in that order", () => {
    const { container } = renderCard();
    expect(fieldLabels(container)).toEqual(FIELD_LABELS);
  });

  it("narrows country and language as you type and saves the picked codes", async () => {
    const { onSave } = renderCard({
      suggestion: {
        sector_code: "government",
        company_organization: "Kenya Forest Service",
      },
    });
    const country = comboInput(COUNTRY);

    // Contains, case-insensitive: "PER" matches Peru but not Portugal.
    await typeInto(country, "PER");
    expect(openOptions()).toEqual(["Peru"]);
    await typeInto(country, "r");
    expect(openOptions()).toEqual(["Brazil", "Peru", "Portugal"]);
    await typeInto(country, "ken");
    expect(openOptions()).toEqual(["Kenya"]);
    await pick("Kenya");
    expect(country.value).toBe("Kenya");

    // Accents are ignored too, so "portugues" finds Português.
    await typeInto(comboInput(LANGUAGE), "portugues");
    expect(openOptions()).toEqual(["Português"]);
    await pick("Português");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      sector_code: "government",
      country_code: "KEN",
      company_organization: "Kenya Forest Service",
      preferred_language_code: "pt",
      ...NO_OPT_INS,
      has_profile: true,
    });
  });

  it("picks the first match with Enter", async () => {
    const { onSave } = renderCard({
      suggestion: { sector_code: "government", company_organization: "SEMAS" },
    });
    const country = comboInput(COUNTRY);
    await typeInto(country, "bra");
    await press(country, "Enter");
    expect(country.value).toBe("Brazil");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ country_code: "BRA" })
    );
  });

  it("keeps the picked option when the typed text is cleared or matches nothing", async () => {
    const { onSave } = renderCard({ suggestion: fullGfw });
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    // Emptied, closed with Escape, then left: back to the picked label.
    const language = comboInput(LANGUAGE);
    await typeInto(language, "");
    expect(openOptions()).toEqual(["English", "Português"]);
    await press(language, "Escape");
    await settle(() => fireEvent.blur(language));
    expect(language.value).toBe("Português");

    const country = comboInput(COUNTRY);
    await typeInto(country, "xyz");
    expect(openOptions()).toEqual([]);
    expect(screen.getByText("No matches")).toBeTruthy();
    await settle(() => fireEvent.blur(country));
    expect(country.value).toBe("Brazil");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        country_code: "BRA",
        preferred_language_code: "pt",
      })
    );
  });

  it("clears the optional language with its clear button", async () => {
    const { onSave } = renderCard({ suggestion: fullGfw });
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    await settle(() =>
      fireEvent.click(
        screen.getByRole("button", { name: "Clear Preferred language" })
      )
    );
    expect(comboInput(LANGUAGE).value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const patch = onSave.mock.calls[0][0];
    expect(patch).not.toHaveProperty("preferred_language_code");
    expect(patch).toMatchObject({ country_code: "BRA" });
  });

  it("asks a thin GFW profile to fill in the rest", () => {
    renderCard({ suggestion: { sector_code: "government" } });
    expect(
      screen.getByText("We found part of your Global Forest Watch profile")
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("keeps Save disabled for a new person until the organisation is set", () => {
    renderCard({
      defaultCountry: "KEN",
      suggestion: { sector_code: "ngo" },
    });
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(organisationInput(), {
      target: { value: "Kenya Forest Service" },
    });
    expect(saveButton().disabled).toBe(false);
  });

  it("greets a new person", () => {
    renderCard();
    expect(screen.getByText("Help us tailor Global Nature Watch")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it("reveals the email list's fields, prefilled, only once ticked", async () => {
    const { onSave } = renderCard({
      suggestion: { ...fullGfw, topics: ["fires"] },
      names: { firstName: "Maria", lastName: "Silva" },
    });
    expect(screen.queryByRole("textbox", { name: /First name/ })).toBeNull();

    await settle(() =>
      fireEvent.click(screen.getByRole("checkbox", { name: /Send me emails/ }))
    );
    const first = screen.getByRole("textbox", {
      name: /First name/,
    }) as HTMLInputElement;
    expect(first.value).toBe("Maria");
    expect(
      screen.getByRole("button", { name: "Fires" }).getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Water" }));
    fireEvent.click(saveButton("Looks right"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        receive_news_emails: true,
        first_name: "Maria",
        last_name: "Silva",
        topics: ["fires", "water"],
      })
    );
  });

  it("needs names and a topic before saving with the email opt-in", async () => {
    renderCard({ suggestion: fullGfw });
    await settle(() =>
      fireEvent.click(screen.getByRole("checkbox", { name: /Send me emails/ }))
    );
    expect(saveButton("Looks right").disabled).toBe(true);
  });

  it("sends the feature-testing opt-in", async () => {
    const { onSave } = renderCard({ suggestion: fullGfw });
    await settle(() =>
      fireEvent.click(
        screen.getByRole("checkbox", { name: /help test new features/ })
      )
    );
    fireEvent.click(saveButton("Looks right"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ help_test_features: true })
    );
  });

  it("links to the full profile form in both modes", () => {
    const { unmount } = renderCard();
    const href = () =>
      screen.getByRole("link", { name: /full profile/i }).getAttribute("href");
    expect(href()).toBe("/dashboard");
    unmount();
    renderCard({ suggestion: fullGfw });
    expect(href()).toBe("/dashboard");
  });

  it("toggles the privacy links from the ?", () => {
    renderCard();
    expect(screen.queryByRole("link", { name: "Privacy Policy" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "How we use your data" })
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeTruthy();
  });

  it("calls onDismiss for Not now", () => {
    const { onDismiss, onSave } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
