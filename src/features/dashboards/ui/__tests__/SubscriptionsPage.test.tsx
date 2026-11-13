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
const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => router,
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
}));

import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import useAuthStore from "@/app/store/authStore";
import SubscriptionsPage from "../SubscriptionsPage";

type Row = { name: string; email: boolean; eligible: boolean };
// The backend's view: what a refetch returns.
let server: Record<string, Row> = {};
let failBulkOff = false;

const wire = (id: string) => ({
  id,
  user_id: "u1",
  name: server[id].name,
  is_public: false,
  eligible_for_subscription: server[id].eligible,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
  aois: [
    {
      id: `${id}-aoi`,
      source: "gadm",
      src_id: "BRA.18_1",
      subtype: "state-province",
      name: server[id].name,
      position: 0,
    },
  ],
  subscriptions: {
    integrated_alerts: { channels: server[id].email ? ["email"] : [] },
  },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function useServer(rows: Record<string, Row>) {
  server = rows;
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    const method = init?.method ?? "GET";
    const url = String(path);
    if (method === "GET" && url === "/api/dashboards") {
      return json(
        200,
        Object.keys(server).map((id) => wire(id))
      );
    }
    if (method === "DELETE" && url === "/api/subscriptions?channel=email") {
      if (failBulkOff) return json(500, { detail: "Boom" });
      const changed = Object.keys(server).filter((id) => server[id].email);
      changed.forEach((id) => (server[id].email = false));
      return json(200, { dashboard_ids: changed });
    }
    if (method === "PUT" && url === "/api/subscriptions") {
      const ids: string[] = JSON.parse(String(init?.body)).dashboard_ids;
      const subscribed = ids.filter((id) => server[id]?.eligible);
      subscribed.forEach((id) => (server[id].email = true));
      return json(200, {
        dashboard_ids: subscribed,
        skipped: ids.filter((id) => !subscribed.includes(id)),
      });
    }
    const single = url.match(/^\/api\/dashboards\/(.+)\/subscriptions$/);
    if (method === "PUT" && single) {
      server[single[1]].email = JSON.parse(
        String(init?.body)
      ).channels.includes("email");
      return json(200, wire(single[1]));
    }
    throw new Error(`Unexpected ${method} ${url}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <SubscriptionsPage />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

// The rendered state: happy-dom leaves a hidden input's native `checked`
// flipped by a click even after a rollback.
const isOn = (input: HTMLElement) =>
  input.closest("label")?.getAttribute("data-state") === "checked";
const emailSwitch = (name: string) =>
  screen.getByRole("checkbox", { name: `Email alerts for ${name}` });
const turnOffAll = () =>
  screen.getByRole("button", { name: "Turn off all alert emails" });

beforeEach(() => {
  failBulkOff = false;
  vi.mocked(toaster.create).mockClear();
  vi.mocked(apiFetch).mockReset();
  Object.values(router).forEach((fn) => fn.mockClear());
  useAuthStore.setState({ userEmail: "ana@example.org" });
  useServer({
    d1: { name: "Paraná", email: true, eligible: true },
    d2: { name: "Darién", email: true, eligible: true },
    d3: { name: "Chaco", email: false, eligible: true },
    d4: { name: "Coffee farm", email: false, eligible: false },
  });
});

describe("SubscriptionsPage", () => {
  it("lists each dashboard with its area, link and email switch", async () => {
    renderPage();

    const link = await screen.findByRole("link", { name: "Paraná" });
    expect(link.getAttribute("href")).toBe("/dashboards/d1");
    expect(screen.getAllByText("State or province · BRA")).toHaveLength(4);
    expect(isOn(emailSwitch("Paraná"))).toBe(true);
    expect(isOn(emailSwitch("Chaco"))).toBe(false);
    expect(screen.getByText(/ana@example\.org/)).toBeTruthy();
    expect(screen.queryByText("In Horizon")).toBeNull();
  });

  it("disables the switch of a dashboard that cannot have alerts and says why", async () => {
    renderPage();

    await screen.findByRole("link", { name: "Coffee farm" });

    expect((emailSwitch("Coffee farm") as HTMLInputElement).disabled).toBe(
      true
    );
    expect(
      screen.getByText("Needs an integrated alerts chart or map")
    ).toBeTruthy();
  });

  it("saves a switch and keeps it after the refetch", async () => {
    renderPage();
    await screen.findByRole("link", { name: "Chaco" });

    fireEvent.click(emailSwitch("Chaco"));

    await waitFor(() => expect(server.d3.email).toBe(true));
    await waitFor(() => expect(isOn(emailSwitch("Chaco"))).toBe(true));
  });

  it("turns email off for every dashboard in one request and offers Undo", async () => {
    renderPage();
    await screen.findByRole("link", { name: "Paraná" });

    fireEvent.click(turnOffAll());

    await screen.findByText(
      "All alert emails are off. You'll still see weekly alerts inside Horizon."
    );
    const bulkCalls = vi
      .mocked(apiFetch)
      .mock.calls.filter(([, init]) => init?.method === "DELETE");
    expect(bulkCalls).toHaveLength(1);
    await waitFor(() => expect(isOn(emailSwitch("Paraná"))).toBe(false));
    expect(isOn(emailSwitch("Darién"))).toBe(false);
    await waitFor(() =>
      expect((turnOffAll() as HTMLButtonElement).disabled).toBe(true)
    );
  });

  it("restores exactly the dashboards that had email on when the user selects Undo", async () => {
    renderPage();
    await screen.findByRole("link", { name: "Paraná" });
    fireEvent.click(turnOffAll());
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => expect(isOn(emailSwitch("Paraná"))).toBe(true));
    expect(isOn(emailSwitch("Darién"))).toBe(true);
    expect(isOn(emailSwitch("Chaco"))).toBe(false);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("leaves every switch alone and shows an error when turning all off fails", async () => {
    failBulkOff = true;
    renderPage();
    await screen.findByRole("link", { name: "Paraná" });

    fireEvent.click(turnOffAll());

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      )
    );
    expect(isOn(emailSwitch("Paraná"))).toBe(true);
    expect(screen.queryByText(/All alert emails are off/)).toBeNull();
  });

  it("disables the button when no dashboard has email on", async () => {
    useServer({ d1: { name: "Paraná", email: false, eligible: true } });
    renderPage();

    await screen.findByRole("link", { name: "Paraná" });

    expect((turnOffAll() as HTMLButtonElement).disabled).toBe(true);
  });

  it("links to the dashboards when the user has none", async () => {
    useServer({});
    renderPage();

    const link = await screen.findByRole("link", { name: /dashboards/i });

    expect(link.getAttribute("href")).toBe("/dashboards");
  });

  it("goes back to the previous page", async () => {
    window.history.replaceState({ idx: 1 }, "");
    renderPage();
    await screen.findByRole("link", { name: "Paraná" });

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(router.back).toHaveBeenCalled();
  });
});
