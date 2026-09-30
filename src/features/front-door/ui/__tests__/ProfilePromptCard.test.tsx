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
  render(
    <ChakraProvider value={defaultSystem}>
      <ProfilePromptCard
        options={options}
        onSave={onSave}
        onDismiss={onDismiss}
        {...props}
      />
    </ChakraProvider>
  );
  return { onSave, onDismiss };
}

describe("ProfilePromptCard", () => {
  it("confirms a full GFW profile in one click", () => {
    const { onSave } = renderCard({ suggestion: fullGfw });
    expect(
      screen.getByText("We found your Global Forest Watch profile")
    ).toBeTruthy();
    expect(screen.getByText("State environment agency")).toBeTruthy();
    expect(screen.getByText("Português")).toBeTruthy();

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

  it("switches to prefilled fields on Edit", () => {
    const { onSave } = renderCard({ suggestion: fullGfw });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Check your details")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
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
