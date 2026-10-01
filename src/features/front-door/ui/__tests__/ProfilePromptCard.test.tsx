// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  countries: { BRA: "Brazil", KEN: "Kenya" },
  languages: { en: "English", pt: "Português" },
};

const fullGfw: ProfileSuggestion = {
  source: "gfw",
  organisation: "State environment agency",
  sector: "government",
  role: "analyst",
  country: "BRA",
  language: "pt",
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
    const { language, organisation, role, ...rest } = fullGfw;
    void language;
    void organisation;
    void role;
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
    for (const value of ["Brazil", "Português", "Government", "Analyst"]) {
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

  it("asks a thin GFW profile to fill in the rest", () => {
    renderCard({ suggestion: { source: "gfw", sector: "government" } });
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
