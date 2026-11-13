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

import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import DashboardHeader from "../DashboardHeader";
import { dashboardKeys, useDashboard } from "../dashboardQueries";
import type { Dashboard } from "../../api/schemas";

// The backend's view of each dashboard: what a refetch returns.
let server: Record<string, { email: boolean; eligible: boolean }> = {};
const wire = (id: string) => ({
  id,
  user_id: "u1",
  name: "My dashboard",
  is_public: false,
  eligible_for_subscription: server[id].eligible,
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
  subscriptions: {
    integrated_alerts: { channels: server[id].email ? ["email"] : [] },
  },
});

const cached = (
  id: string,
  subscriptions: Dashboard["subscriptions"]
): Dashboard => ({
  ...wire(id),
  description: null,
  sections: [],
  widgets: [],
  subscriptions,
});

function Harness({ id, isOwner }: { id: string; isOwner: boolean }) {
  const { data } = useDashboard(id);
  return data ? <DashboardHeader dashboard={data} isOwner={isOwner} /> : null;
}

let queryClient: QueryClient;

function renderHeader({
  email = false,
  eligible = true,
  withSubscriptions = true,
  isOwner = true,
} = {}) {
  // The server starts where the cache does.
  server = { d1: { email, eligible } };
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(
    dashboardKeys.detail("d1"),
    cached("d1", withSubscriptions ? { emailEnabled: email } : undefined)
  );
  const view = (id: string) => (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <Harness id={id} isOwner={isOwner} />
      </ChakraProvider>
    </QueryClientProvider>
  );
  const { rerender } = render(view("d1"));
  return { switchTo: (id: string) => rerender(view(id)) };
}

// What the backend does when the last integrated alerts widget goes, seen
// through the refetch any widget change triggers.
const removeLastAlertsWidget = () => {
  server.d1 = { email: false, eligible: false };
  return queryClient.invalidateQueries({
    queryKey: dashboardKeys.detail("d1"),
  });
};

const alertsButton = () => screen.queryByRole("button", { name: /alerts/i });

const openPopover = async () => {
  fireEvent.click(alertsButton()!);
  return (await screen.findByRole("checkbox", {
    name: "Email alerts",
  })) as HTMLInputElement;
};

// The switch's rendered state. happy-dom leaves the hidden input's native
// `checked` flipped by a click even after a rollback, so assert on this.
const isOn = (input: HTMLInputElement) =>
  input.closest("label")?.getAttribute("data-state") === "checked";

const expectPut = (channels: string[]) =>
  waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/dashboards/d1/subscriptions",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ datasets: ["integrated_alerts"], channels }),
      })
    )
  );

const emailOffNotice = () =>
  vi
    .mocked(toaster.create)
    .mock.calls.some(([toast]) => toast.title === "Email alerts turned off");

beforeEach(() => {
  vi.mocked(toaster.create).mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    const id = String(path).split("/")[3];
    if (init?.method === "PUT") {
      server[id].email = JSON.parse(String(init.body)).channels.includes(
        "email"
      );
    }
    return new Response(JSON.stringify(wire(id)), { status: 200 });
  });
});

describe("DashboardHeader alerts gate", () => {
  it("shows no alerts control to a non-owner", () => {
    renderHeader({ isOwner: false });
    expect(alertsButton()).toBeNull();
  });

  it("shows no alerts control on a dashboard that can't have email alerts", () => {
    renderHeader({ eligible: false });
    expect(alertsButton()).toBeNull();
  });

  it("shows no alerts control when the backend sent no settings", () => {
    renderHeader({ withSubscriptions: false });
    expect(alertsButton()).toBeNull();
  });
});

describe("DashboardAlertsMenu", () => {
  it("starts off, names the area and shows the myGFW note", async () => {
    renderHeader();
    expect(alertsButton()?.textContent).toContain("Off");

    const email = await openPopover();

    expect(isOn(email)).toBe(false);
    expect(screen.getByText("Alerts for Paraná, Brazil")).toBeTruthy();
    expect(screen.getByText(/You may get two emails/)).toBeTruthy();
    expect(screen.queryByText(/In Horizon/)).toBeNull();
  });

  it("turns email on and keeps it after the refetch", async () => {
    renderHeader();
    const email = await openPopover();

    fireEvent.click(email);

    await expectPut(["email"]);
    await waitFor(() => expect(alertsButton()?.textContent).toContain("Email"));
    await queryClient.refetchQueries({ queryKey: dashboardKeys.detail("d1") });
    expect(isOn(email)).toBe(true);
  });

  it("turns email off", async () => {
    renderHeader({ email: true });
    const email = await openPopover();

    fireEvent.click(email);

    await expectPut([]);
    await waitFor(() => expect(isOn(email)).toBe(false));
    expect(alertsButton()?.textContent).toContain("Off");
  });

  it("rolls the switch back and shows the backend's reason when saving fails", async () => {
    vi.mocked(apiFetch).mockImplementation(async (_path, init) =>
      init?.method === "PUT"
        ? new Response(
            JSON.stringify({ detail: "Dashboard is not eligible" }),
            { status: 409 }
          )
        : new Response(JSON.stringify(wire("d1")), { status: 200 })
    );
    renderHeader();
    const email = await openPopover();

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
  });

  it("disables the switch while a save is in flight", async () => {
    let finish: (res: Response) => void = () => {};
    vi.mocked(apiFetch).mockImplementation((_path, init) =>
      init?.method === "PUT"
        ? new Promise<Response>((resolve) => (finish = resolve))
        : Promise.resolve(
            new Response(JSON.stringify(wire("d1")), { status: 200 })
          )
    );
    renderHeader();
    const email = await openPopover();

    fireEvent.click(email);

    await waitFor(() => expect(email.disabled).toBe(true));
    finish(new Response("{}", { status: 200 }));
    await waitFor(() => expect(email.disabled).toBe(false));
  });
});

describe("Email turned off by removing the last integrated alerts widget", () => {
  it("tells the owner, and hides the control", async () => {
    renderHeader({ email: true });

    await removeLastAlertsWidget();

    await waitFor(() => expect(emailOffNotice()).toBe(true));
    expect(alertsButton()).toBeNull();
  });

  it("says nothing when email was already off", async () => {
    renderHeader({ email: false });

    await removeLastAlertsWidget();

    await waitFor(() => expect(alertsButton()).toBeNull());
    expect(emailOffNotice()).toBe(false);
  });

  it("says nothing to a superuser looking at someone else's dashboard", async () => {
    renderHeader({ email: true, isOwner: false });

    await removeLastAlertsWidget();

    await waitFor(() =>
      expect(
        queryClient.getQueryData<Dashboard>(dashboardKeys.detail("d1"))
          ?.eligible_for_subscription
      ).toBe(false)
    );
    expect(emailOffNotice()).toBe(false);
  });

  it("says nothing when switching to another dashboard", async () => {
    const { switchTo } = renderHeader({ email: true });
    server.d2 = { email: false, eligible: false };
    queryClient.setQueryData(
      dashboardKeys.detail("d2"),
      cached("d2", { emailEnabled: false })
    );

    switchTo("d2");

    await waitFor(() => expect(alertsButton()).toBeNull());
    expect(emailOffNotice()).toBe(false);
  });
});
