// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
let flagOn = true;
vi.mock("@/src/shared/lib/feature-flags", () => ({
  useFeatureFlag: (flag: string) => flagOn && flag === "email-subscriptions",
}));

import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import DashboardHeader from "../DashboardHeader";
import { dashboardKeys, useDashboard } from "../dashboardQueries";
import type { Dashboard } from "../../api/schemas";

// The backend's view of the dashboard: what a refetch after the PUT returns.
let serverModes: string[] = ["in-app"];
const wire = () => ({
  id: "d1",
  user_id: "u1",
  name: "My dashboard",
  is_public: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
  aois: [
    {
      id: "a1",
      source: "gadm",
      src_id: "BRA.18_1",
      subtype: "state-province",
      name: "Paraná, Brazil",
      position: 0,
    },
  ],
  alerts: { integrated_alerts: { modes: serverModes } },
});

const dashboard = (alerts: Dashboard["alerts"]): Dashboard => ({
  ...wire(),
  description: null,
  sections: [],
  widgets: [],
  alerts,
});

function Harness({ isOwner }: { isOwner: boolean }) {
  const { data } = useDashboard("d1");
  return data ? <DashboardHeader dashboard={data} isOwner={isOwner} /> : null;
}

const ELIGIBLE: Dashboard["alerts"] = {
  inAppEnabled: true,
  emailEnabled: false,
};

function renderHeader(alerts: Dashboard["alerts"], { isOwner = true } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail("d1"), dashboard(alerts));
  render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <Harness isOwner={isOwner} />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

const alertsButton = () => screen.queryByRole("button", { name: /alerts/i });

const openPopover = async () => {
  fireEvent.click(alertsButton()!);
  return (await screen.findByRole("checkbox", {
    name: "Email alerts",
  })) as HTMLInputElement;
};

beforeEach(() => {
  flagOn = true;
  serverModes = ["in-app"];
  vi.mocked(toaster.create).mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockImplementation(async (_path, init) => {
    if (init?.method === "PUT") {
      serverModes = JSON.parse(String(init.body)).modes;
    }
    return new Response(JSON.stringify(wire()), { status: 200 });
  });
});

describe("DashboardHeader alerts gate", () => {
  it("shows no alerts control outside the beta", () => {
    flagOn = false;
    renderHeader(ELIGIBLE);
    expect(alertsButton()).toBeNull();
  });

  it("shows no alerts control to a non-owner", () => {
    renderHeader(ELIGIBLE, { isOwner: false });
    expect(alertsButton()).toBeNull();
  });

  it("shows no alerts control when the backend sent no settings", () => {
    renderHeader(undefined);
    expect(alertsButton()).toBeNull();
  });

  it("shows the control with everything off, so alerts can be turned on", async () => {
    renderHeader({ inAppEnabled: false, emailEnabled: false });
    expect(alertsButton()?.textContent).toContain("Off");
    expect((await openPopover()).checked).toBe(false);
  });
});

describe("DashboardAlertsMenu", () => {
  it("starts with email off, names the area and shows the myGFW note", async () => {
    renderHeader(ELIGIBLE);
    expect(alertsButton()?.textContent).toContain("In-app");

    const email = await openPopover();

    expect(email.checked).toBe(false);
    expect(screen.getByText("Alerts for Paraná, Brazil")).toBeTruthy();
    expect(screen.getByText(/You may get two emails/)).toBeTruthy();
  });

  it("saves email on and keeps it after the refetch", async () => {
    renderHeader(ELIGIBLE);
    const email = await openPopover();

    fireEvent.click(email);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/dashboards/d1/subscriptions",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            datasets: ["integrated_alerts"],
            modes: ["in-app", "email"],
          }),
        })
      )
    );
    // The refetch on settle reads the saved value back, as a reload would.
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/api/dashboards/d1", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
    );
    await waitFor(() =>
      expect(alertsButton()?.textContent).toContain("In-app + email")
    );
    expect(email.checked).toBe(true);
  });

  it("rolls the switch back and shows the backend's reason when saving fails", async () => {
    vi.mocked(apiFetch).mockImplementation(async (_path, init) =>
      init?.method === "PUT"
        ? new Response(
            JSON.stringify({ detail: "Dashboard is not eligible" }),
            {
              status: 409,
            }
          )
        : new Response(JSON.stringify(wire()), { status: 200 })
    );
    renderHeader(ELIGIBLE);
    const email = await openPopover();

    fireEvent.click(email);

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't update email alerts",
          description: "Dashboard is not eligible",
          type: "error",
        })
      )
    );
    // The switch's rendered state. happy-dom leaves the hidden input's
    // native `checked` flipped by the click, so it isn't asserted here.
    await waitFor(() =>
      expect(email.closest("label")?.getAttribute("data-state")).toBe(
        "unchecked"
      )
    );
  });

  it("disables the switch while the save is in flight", async () => {
    let finish: (res: Response) => void = () => {};
    vi.mocked(apiFetch).mockImplementation((_path, init) =>
      init?.method === "PUT"
        ? new Promise<Response>((resolve) => (finish = resolve))
        : Promise.resolve(new Response(JSON.stringify(wire()), { status: 200 }))
    );
    renderHeader(ELIGIBLE);
    const email = await openPopover();

    fireEvent.click(email);

    await waitFor(() => expect(email.disabled).toBe(true));
    finish(new Response("{}", { status: 200 }));
    await waitFor(() => expect(email.disabled).toBe(false));
  });
});
