// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { useReducer } from "react";
// eslint-disable-next-line no-restricted-imports -- tests drive a real router
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { useRouter, useSearchParams } from "../router";

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
});
