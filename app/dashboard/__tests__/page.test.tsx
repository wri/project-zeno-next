// @vitest-environment happy-dom
/**
 * The user profile page and the settings shell around it, in the active locale.
 * Names the person typed and their email stay as entered.
 */
import { ChakraProvider } from "@chakra-ui/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";
import { catalogs, i18n, rememberLocale } from "@/src/shared/lib/i18n";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/hooks/useAuthGuard", () => ({
  useAuthGuard: () => true,
}));

vi.mock("@/app/hooks/useThreadsInfinite", () => ({
  useThreadsInfinite: () => ({ threads: [] }),
}));

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(async () => ({ ok: false })),
  clearToken: vi.fn(),
}));

vi.mock("@/app/lib/ortto", () => ({
  orttoTopicLabels: (codes: string[]) => codes,
  submitOrttoProfile: vi.fn(async () => undefined),
}));

import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import UserProfilePage from "../page";

function renderPage() {
  return render(
    <ChakraProvider value={system}>
      <UserProfilePage />
    </ChakraProvider>
  );
}

describe("User profile page", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(
      async () => ({ ok: false }) as Response
    );
    useAuthStore.getState().setAuthStatus({
      email: "ada@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
    useAuthStore.getState().setPromptUsage(4, 20);
  });

  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("renders the page and settings shell in the active locale", async () => {
    const es = catalogs.es;
    await act(() => i18n.changeLanguage("es"));
    renderPage();

    expect(
      screen.getByRole("heading", { name: es["account.profile"] })
    ).toBeTruthy();
    expect(screen.getByText(es["profile.save"]!)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: es["settings.backToMap"] })
    ).toBeTruthy();
    // The email stays as entered.
    expect(
      screen
        .getByRole("button", { name: "ada@example.com" })
        .getAttribute("title")
    ).toBe(es["account.signOut"]);
  });
});

const PROFILE_CONFIG = {
  sectors: { ngo: "NGO" },
  sector_roles: { ngo: { analyst: "Analyst" } },
  countries: { BRA: "Brazil" },
  languages: { en: "English", es: "Español", pt: "Português" },
  gis_expertise_levels: {},
};

function profileUser(preferredLanguageCode: string | null) {
  return {
    email: "ada@example.com",
    id: "u1",
    hasProfile: true,
    firstName: "Ada",
    lastName: "Lovelace",
    sectorCode: "ngo",
    roleCode: "analyst",
    companyOrganization: "WRI",
    countryCode: "BRA",
    preferredLanguageCode,
  };
}

/** A loaded profile the save button will accept. */
function mockProfileApis(preferredLanguageCode: string | null) {
  const user = profileUser(preferredLanguageCode);
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    if (path === "/api/auth/me") {
      return Response.json(user);
    }
    if (path === "/api/profile/config") {
      return Response.json(PROFILE_CONFIG);
    }
    if (path === "/api/auth/profile" && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as {
        preferred_language_code: string | null;
      };
      return Response.json({
        ...user,
        preferredLanguageCode: body.preferred_language_code,
      });
    }
    return new Response(null, { status: 404 });
  });
}

async function saveProfile() {
  const save = await screen.findByRole("button", { name: "Save changes" });
  await waitFor(() => {
    expect((save as HTMLButtonElement).disabled).toBe(false);
  });
  fireEvent.click(save);
  await waitFor(() => {
    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Profile saved" })
    );
  });
}

async function chooseLanguage(label: string) {
  const trigger = await screen.findByRole("combobox", {
    name: /Preferred language/,
  });
  await act(async () => {
    fireEvent.click(trigger);
  });
  const option = await screen.findByRole("option", { name: label });
  await act(async () => {
    fireEvent.click(option);
  });
}

describe("Saving a preferred language", () => {
  beforeEach(() => {
    useAuthStore.getState().setAuthStatus({
      email: "ada@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
      preferredLanguageCode: "pt",
    });
    rememberLocale("fr");
    vi.mocked(toaster.create).mockClear();
  });

  afterEach(async () => {
    document.cookie = "gnw_locale=; Max-Age=0; Path=/";
    await act(() => i18n.changeLanguage("en"));
    useAuthStore.getState().clearAuth();
  });

  it("leaves this device's display language when the preference did not change", async () => {
    mockProfileApis("pt");
    renderPage();

    await saveProfile();

    expect(document.cookie).toContain("gnw_locale=fr");
    expect(i18n.language).toBe("en");
  });

  it("adopts a new preference and drops this device's display language", async () => {
    mockProfileApis("pt");
    renderPage();

    await chooseLanguage("Español");
    await saveProfile();

    expect(document.cookie).not.toMatch(/gnw_locale=\w/);
    expect(i18n.language).toBe("es");
  });

  it("adopts a cleared preference as English", async () => {
    mockProfileApis(null);
    renderPage();

    await saveProfile();

    expect(document.cookie).not.toMatch(/gnw_locale=\w/);
    expect(i18n.language).toBe("en");
  });
});
