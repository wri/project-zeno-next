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
import { ALERT_MODES, type Dashboard } from "../../api/schemas";

// The backend's view of the dashboard: what a refetch after the PUT returns.
let serverModes: string[] = [];
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

function renderHeader(alerts: Dashboard["alerts"], { isOwner = true } = {}) {
  // The server starts where the cache does.
  serverModes = alerts ? ALERT_MODES[alerts] : [];
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
  const email = (await screen.findByRole("checkbox", {
    name: "Email alerts",
  })) as HTMLInputElement;
  const inApp = screen.getByRole("checkbox", {
    name: "In Horizon alerts",
  }) as HTMLInputElement;
  return { inApp, email };
};

// The switch's rendered state. happy-dom leaves the hidden input's native
// `checked` flipped by a click even after a rollback, so assert on this.
const isOn = (input: HTMLInputElement) =>
  input.closest("label")?.getAttribute("data-state") === "checked";

const expectPut = (modes: string[]) =>
  waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/dashboards/d1/subscriptions",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ datasets: ["integrated_alerts"], modes }),
      })
    )
  );

// The refetch on settle reads the saved value back, as a reload would.
const expectRefetch = () =>
  waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith("/api/dashboards/d1", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
  );

beforeEach(() => {
  flagOn = true;
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
    renderHeader("off");
    expect(alertsButton()).toBeNull();
  });

  it("shows no alerts control to a non-owner", () => {
    renderHeader("email", { isOwner: false });
    expect(alertsButton()).toBeNull();
  });

  it("shows no alerts control when the backend sent no settings", () => {
    renderHeader(undefined);
    expect(alertsButton()).toBeNull();
  });
});

describe("DashboardAlertsMenu", () => {
  it("starts with both off, names the area and shows the myGFW note", async () => {
    renderHeader("off");
    expect(alertsButton()?.textContent).toContain("Off");

    const { inApp, email } = await openPopover();

    expect(isOn(inApp)).toBe(false);
    expect(isOn(email)).toBe(false);
    expect(screen.getByText("Alerts for Paraná, Brazil")).toBeTruthy();
    expect(screen.getByText(/You may get two emails/)).toBeTruthy();
  });

  it("turns in-app on by itself", async () => {
    renderHeader("off");
    const { inApp, email } = await openPopover();

    fireEvent.click(inApp);

    await expectPut(["in-app"]);
    await expectRefetch();
    await waitFor(() =>
      expect(alertsButton()?.textContent).toContain("In-app")
    );
    expect(isOn(email)).toBe(false);
  });

  it("email on also turns in-app on, says so, and keeps it after the refetch", async () => {
    renderHeader("off");
    const { inApp, email } = await openPopover();

    fireEvent.click(email);

    await expectPut(["in-app", "email"]);
    await expectRefetch();
    await waitFor(() =>
      expect(alertsButton()?.textContent).toContain("In-app + email")
    );
    expect(isOn(inApp)).toBe(true);
    expect(isOn(email)).toBe(true);
    expect(
      screen.getByText(/We also turned on alerts in Horizon/)
    ).toBeTruthy();
  });

  it("doesn't say in-app was turned on when it already was", async () => {
    renderHeader("in-app");
    const { email } = await openPopover();

    fireEvent.click(email);

    await expectPut(["in-app", "email"]);
    await waitFor(() => expect(isOn(email)).toBe(true));
    expect(
      screen.queryByText(/We also turned on alerts in Horizon/)
    ).toBeNull();
  });

  it("email off leaves in-app on", async () => {
    renderHeader("email");
    const { inApp, email } = await openPopover();

    fireEvent.click(email);

    await expectPut(["in-app"]);
    await waitFor(() => expect(isOn(email)).toBe(false));
    expect(isOn(inApp)).toBe(true);
    expect(alertsButton()?.textContent).toContain("In-app");
  });

  it("in-app off also turns email off", async () => {
    renderHeader("email");
    const { inApp, email } = await openPopover();

    fireEvent.click(inApp);

    await expectPut([]);
    await waitFor(() => expect(isOn(inApp)).toBe(false));
    expect(isOn(email)).toBe(false);
    expect(alertsButton()?.textContent).toContain("Off");
  });

  it("rolls both switches back and shows the backend's reason when saving fails", async () => {
    vi.mocked(apiFetch).mockImplementation(async (_path, init) =>
      init?.method === "PUT"
        ? new Response(
            JSON.stringify({ detail: "Dashboard is not eligible" }),
            { status: 409 }
          )
        : new Response(JSON.stringify(wire()), { status: 200 })
    );
    renderHeader("off");
    const { inApp, email } = await openPopover();

    fireEvent.click(email);

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't update alerts",
          description: "Dashboard is not eligible",
          type: "error",
        })
      )
    );
    await waitFor(() => expect(isOn(email)).toBe(false));
    expect(isOn(inApp)).toBe(false);
    expect(
      screen.queryByText(/We also turned on alerts in Horizon/)
    ).toBeNull();
  });

  it("disables both switches while a save is in flight", async () => {
    let finish: (res: Response) => void = () => {};
    vi.mocked(apiFetch).mockImplementation((_path, init) =>
      init?.method === "PUT"
        ? new Promise<Response>((resolve) => (finish = resolve))
        : Promise.resolve(new Response(JSON.stringify(wire()), { status: 200 }))
    );
    renderHeader("off");
    const { inApp, email } = await openPopover();

    fireEvent.click(email);

    await waitFor(() => expect(email.disabled).toBe(true));
    expect(inApp.disabled).toBe(true);
    finish(new Response("{}", { status: 200 }));
    await waitFor(() => expect(email.disabled).toBe(false));
    expect(inApp.disabled).toBe(false);
  });
});
