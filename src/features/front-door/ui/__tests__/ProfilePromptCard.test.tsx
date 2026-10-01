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

const options: ProfileCardOptions = {
  sectors: { government: "Government", ngo: "NGO / Non-profit" },
  sector_roles: {
    government: { analyst: "Analyst" },
    ngo: { field_officer: "Field officer" },
  },
  countries: { BRA: "Brazil", KEN: "Kenya", PER: "Peru", PRT: "Portugal" },
  languages: { en: "English", pt: "Português" },
};

const fullGfw: ProfileSuggestion = {
  company_organization: "State environment agency",
  sector_code: "government",
  role_code: "analyst",
  country_code: "BRA",
  preferred_language_code: "pt",
};

function renderCard(props: Partial<ProfilePromptCardProps> = {}) {
  const onSave = vi.fn();
  const onDismiss = vi.fn();
  const { container } = render(
    <ChakraProvider value={defaultSystem}>
      <ProfilePromptCard
        options={options}
        onSave={onSave}
        onDismiss={onDismiss}
        {...props}
      />
    </ChakraProvider>
  );
  return { onSave, onDismiss, container };
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
  return [...container.querySelectorAll("label")].map(
    (l) => l.textContent ?? ""
  );
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
      ["Role", "Analyst"],
      ["Organisation", "State environment agency"],
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(onSave).toHaveBeenCalledWith({
      sector_code: "government",
      role_code: "analyst",
      country_code: "BRA",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      has_profile: true,
    });
  });

  it("leaves out confirm rows GFW had no value for", () => {
    const {
      preferred_language_code,
      company_organization,
      role_code,
      ...rest
    } = fullGfw;
    void preferred_language_code;
    void company_organization;
    void role_code;
    const { container } = renderCard({ suggestion: rest });
    expect(confirmRows(container)).toEqual([
      ["Country", "Brazil"],
      ["Sector", "Government"],
    ]);
  });

  it("switches to the four fields on Edit, all prefilled including language", () => {
    const { onSave, container } = renderCard({ suggestion: fullGfw });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Check your details")).toBeTruthy();
    expect(fieldLabels(container)).toEqual([
      "Country",
      "Preferred language(Optional)",
      "Sector",
      "Role(Optional)",
    ]);
    expect(comboInput(COUNTRY).value).toBe("Brazil");
    expect(comboInput(LANGUAGE).value).toBe("Português");
    for (const value of ["Government", "Analyst"]) {
      expect(screen.getByText(value, { selector: "span" })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      sector_code: "government",
      role_code: "analyst",
      country_code: "BRA",
      company_organization: "State environment agency",
      preferred_language_code: "pt",
      has_profile: true,
    });
  });

  it("asks for country, language, sector and role in that order", () => {
    const { container } = renderCard();
    expect(fieldLabels(container)).toEqual([
      "Country",
      "Preferred language(Optional)",
      "Sector",
      "Role(Optional)",
    ]);
  });

  it("narrows country and language as you type and saves the picked codes", async () => {
    const { onSave } = renderCard({
      suggestion: { sector_code: "government" },
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
      role_code: null,
      country_code: "KEN",
      preferred_language_code: "pt",
      has_profile: true,
    });
  });

  it("picks the first match with Enter", async () => {
    const { onSave } = renderCard({
      suggestion: { sector_code: "government" },
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
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
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

  it("keeps Save disabled for a new person until sector and country are set", () => {
    renderCard({ defaultCountry: "KEN" });
    expect(screen.getByText("Help us tailor Global Nature Watch")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("calls onDismiss for Not now", () => {
    const { onDismiss, onSave } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
