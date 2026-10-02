// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useZapStore from "../../model/zap-store";
import { useZapMode } from "../use-zap-mode";

let pathname = "/app";
vi.mock("@/app/lib/router", () => ({ usePathname: () => pathname }));

function openWith(search: string) {
  window.history.replaceState(null, "", `/app${search}`);
}

describe("useZapMode", () => {
  beforeEach(() => {
    pathname = "/app";
    useZapStore.getState().setMode("chat");
  });

  it("hides zap mode without ?ff=zap, even when zap mode was stored", () => {
    openWith("");
    useZapStore.getState().setMode("zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({ available: false, active: false });
  });

  it("offers zap mode with ?ff=zap on the map", () => {
    openWith("?ff=zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({ available: true, active: false });
  });

  it("is active with the flag and the zap mode on", () => {
    openWith("?ff=voice,zap");
    useZapStore.getState().setMode("zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({ available: true, active: true });
  });

  it("is not offered off the map, e.g. on a dashboard", () => {
    openWith("?ff=zap");
    pathname = "/dashboards/abc";

    const { result } = renderHook(() => useZapMode());

    expect(result.current.available).toBe(false);
  });
});
