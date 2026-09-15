// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import useViewContextStore from "@/app/store/viewContextStore";
import { usePendingInsightWidgetsStore } from "../../model/pending-insight-widgets-store";
import {
  usePendingInsightWidget,
  usePendingInsightWidgets,
} from "../usePendingInsightWidget";

const entry = {
  title: "Tree cover loss in Pará",
  datasetName: "Tree cover loss",
  chartCountHint: 2,
};

describe("usePendingInsightWidget", () => {
  beforeEach(() => {
    usePendingInsightWidgetsStore.getState().reset();
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("begin/clear drive the dashboard's pending list and the card's isPending", () => {
    const card = renderHook(() => usePendingInsightWidget(4));
    const grid = renderHook(() => usePendingInsightWidgets("d1"));

    expect(card.result.current.isPending).toBe(false);
    expect(grid.result.current).toEqual([]);

    act(() => card.result.current.begin(entry));

    expect(card.result.current.isPending).toBe(true);
    expect(card.result.current.isPendingNow()).toBe(true);
    expect(grid.result.current).toHaveLength(1);
    expect(grid.result.current[0]).toMatchObject({
      key: "d1:4",
      dashboardId: "d1",
      datasetId: 4,
      ...entry,
    });

    act(() => card.result.current.attachInsightId("ins-1"));
    expect(grid.result.current[0].insightId).toBe("ins-1");

    act(() => card.result.current.clear());
    expect(card.result.current.isPending).toBe(false);
    expect(card.result.current.isPendingNow()).toBe(false);
    expect(grid.result.current).toEqual([]);
  });

  it("scopes the pending list to the dashboard", () => {
    const card = renderHook(() => usePendingInsightWidget(4));
    const other = renderHook(() => usePendingInsightWidgets("d2"));

    act(() => card.result.current.begin(entry));

    expect(other.result.current).toEqual([]);
  });

  it("is inert off a dashboard surface", () => {
    useViewContextStore.getState().setViewContext({ page: "map" });
    const card = renderHook(() => usePendingInsightWidget(4));

    act(() => card.result.current.begin(entry));

    expect(card.result.current.isPending).toBe(false);
    expect(usePendingInsightWidgetsStore.getState().entries).toEqual([]);
  });
});
