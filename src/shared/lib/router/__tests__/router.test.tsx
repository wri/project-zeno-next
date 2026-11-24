// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { useReducer } from "react";
// eslint-disable-next-line no-restricted-imports -- tests drive a real router
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Link, useRouter, useSearchParams } from "..";

function setup(initialEntry: string) {
  const hooks = {
    router: null as unknown as ReturnType<typeof useRouter>,
    params: [] as URLSearchParams[],
    rerender: () => {},
  };
  function Probe() {
    hooks.router = useRouter();
    hooks.params.push(useSearchParams());
    hooks.rerender = useReducer((n: number) => n + 1, 0)[1];
    return null;
  }
  const memory = createMemoryRouter([{ path: "*", element: <Probe /> }], {
    initialEntries: [initialEntry],
  });
  render(<RouterProvider router={memory} />);
  return { hooks, memory };
}

describe("router wrapper", () => {
  it("maps replace(href, { scroll: false }) to a scroll-preserving replace", async () => {
    const { hooks, memory } = setup("/evals?tab=runs");

    await act(async () =>
      hooks.router.replace("/evals?tab=sets", { scroll: false })
    );

    expect(memory.state.location.search).toBe("?tab=sets");
    expect(memory.state.historyAction).toBe("REPLACE");
    expect(memory.state.preventScrollReset).toBe(true);
  });

  it("keeps useSearchParams() identity until the query string changes", async () => {
    const { hooks } = setup("/app?prompt=hi");
    const first = hooks.params[0];

    act(() => hooks.rerender());
    expect(hooks.params.length).toBeGreaterThan(1);
    expect(hooks.params.at(-1)).toBe(first);

    await act(async () => hooks.router.push("/app?prompt=bye"));
    expect(hooks.params.at(-1)).not.toBe(first);
    expect(hooks.params.at(-1)?.get("prompt")).toBe("bye");
  });

  describe("carrying ?ff= flags", () => {
    afterEach(() => window.history.replaceState({}, "", "/"));

    it("adds the current flags to push, replace and the back fallback", async () => {
      window.history.replaceState(
        {},
        "",
        "/dashboards/d1?ff=email-subscriptions"
      );
      const { hooks, memory } = setup("/dashboards/d1?ff=email-subscriptions");

      await act(async () => hooks.router.push("/dashboards"));
      expect(memory.state.location.pathname).toBe("/dashboards");
      expect(memory.state.location.search).toBe("?ff=email-subscriptions");

      await act(async () => hooks.router.replace("/app?prompt=hi"));
      expect(memory.state.location.search).toBe(
        "?prompt=hi&ff=email-subscriptions"
      );

      await act(async () => hooks.router.back("/dashboards"));
      expect(memory.state.location.pathname).toBe("/dashboards");
      expect(memory.state.location.search).toBe("?ff=email-subscriptions");
    });

    it("keeps an href's own flags and adds none when the URL has none", async () => {
      window.history.replaceState({}, "", "/app?ff=email-subscriptions");
      const { hooks, memory } = setup("/app?ff=email-subscriptions");

      await act(async () => hooks.router.push("/app?ff=voice"));
      expect(memory.state.location.search).toBe("?ff=voice");

      window.history.replaceState({}, "", "/app");
      await act(async () => hooks.router.push("/dashboards"));
      expect(memory.state.location.search).toBe("");
    });

    it("renders Link hrefs with the flags of the page they are on", () => {
      const memory = createMemoryRouter(
        [
          {
            path: "*",
            element: (
              <>
                <Link href="/dashboards">Dashboards</Link>
                <Link href="https://example.org">Out</Link>
              </>
            ),
          },
        ],
        { initialEntries: ["/app/threads/t1?ff=email-subscriptions"] }
      );
      const { getByText } = render(<RouterProvider router={memory} />);

      expect(getByText("Dashboards").getAttribute("href")).toBe(
        "/dashboards?ff=email-subscriptions"
      );
      expect(getByText("Out").getAttribute("href")).toBe("https://example.org");
    });
  });
});
