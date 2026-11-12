// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useAuthStore from "@/app/store/authStore";

import useZapStore from "../../model/zap-store";
import { useZapMode } from "../use-zap-mode";

let pathname = "/app";
vi.mock("@/app/lib/router", () => ({ usePathname: () => pathname }));

/** The dashboards by id, as the detail query returns them. */
let dashboards: Record<string, { user_id: string }> = {};
const useDashboard = vi.fn((id: string) => ({ data: dashboards[id] }));
vi.mock("@/src/features/dashboards/ui/dashboardQueries", () => ({
  useDashboard: (id: string) => useDashboard(id),
}));

function openWith(search: string) {
  window.history.replaceState(null, "", `/app${search}`);
}

describe("useZapMode", () => {
  beforeEach(() => {
    pathname = "/app";
    dashboards = { mine: { user_id: "u1" }, theirs: { user_id: "u2" } };
    useAuthStore.setState({ userId: "u1" });
    useZapStore.getState().setMode("chat");
    useDashboard.mockClear();
  });

  it("hides zap mode without ?ff=zap, even when zap mode was stored", () => {
    openWith("");
    useZapStore.getState().setMode("zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({
      available: false,
      active: false,
      dashboardId: null,
    });
  });

  it("offers zap mode with ?ff=zap on the map", () => {
    openWith("?ff=zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({
      available: true,
      active: false,
      dashboardId: null,
    });
  });

  it("is active with the flag and the zap mode on", () => {
    openWith("?ff=voice,zap");
    useZapStore.getState().setMode("zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({
      available: true,
      active: true,
      dashboardId: null,
    });
  });

  it("is offered on a dashboard that the user owns", () => {
    openWith("?ff=zap");
    pathname = "/dashboards/mine";
    useZapStore.getState().setMode("zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({
      available: true,
      active: true,
      dashboardId: "mine",
    });
  });

  it("is not offered on a dashboard of an other user", () => {
    openWith("?ff=zap");
    pathname = "/dashboards/theirs";
    useZapStore.getState().setMode("zap");

    const { result } = renderHook(() => useZapMode());

    expect(result.current).toEqual({
      available: false,
      active: false,
      dashboardId: null,
    });
  });

  it("is not offered on a dashboard when the user is signed out", () => {
    openWith("?ff=zap");
    pathname = "/dashboards/mine";
    useAuthStore.setState({ userId: null });

    const { result } = renderHook(() => useZapMode());

    expect(result.current.available).toBe(false);
  });

  it("is not offered on a dashboard without the flag, and reads no dashboard", () => {
    openWith("");
    pathname = "/dashboards/mine";

    const { result } = renderHook(() => useZapMode());

    expect(result.current.available).toBe(false);
    expect(useDashboard).toHaveBeenCalledWith("");
  });

  it("is not offered on the dashboard list", () => {
    openWith("?ff=zap");
    pathname = "/dashboards";

    const { result } = renderHook(() => useZapMode());

    expect(result.current.available).toBe(false);
  });
});
