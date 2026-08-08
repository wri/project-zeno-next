"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { toaster } from "@/app/components/ui/toaster";
import useChatStore from "@/app/store/chatStore";
import {
  analysisService,
  DEFAULT_ANALYSIS_START_DATE,
  DEFAULT_ANALYSIS_END_DATE,
} from "@/src/features/analysis";

import { addInsightWidget, createDashboard } from "../api/dashboards";
import type { Dashboard } from "../api/schemas";
import { dashboardKeys } from "../hooks/dashboardKeys";
import { findDashboardForArea } from "../model/find-dashboard-for-area";
import { useDashboards } from "../hooks/useDashboards";

/**
 * The area a dashboard is being created for, plus the dataset to seed it with.
 * Structurally the payload of a `create-dashboard-nudge` message, so the nudge
 * passes its suggestion straight through; the AOI menu builds one by hand.
 */
export interface CreateDashboardForAreaInput {
  areaName: string;
  source: string;
  srcId: string;
  subtype: string;
  /** Omitted by the AOI menu when no dataset is active — the dashboard then
   *  opens as an empty grid (PZB-1119). */
  datasetId?: number;
  datasetName?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateDashboardForArea {
  /** The dashboard already covering this area, or null. Undefined until the
   *  dashboards list resolves — callers must not offer "create" before then,
   *  or a second dashboard gets made for an area that already has one. */
  existing: Dashboard | null | undefined;
  /** True until the dashboards list has resolved at least once. */
  isResolving: boolean;
  /** True while POST /api/dashboards is in flight. Does NOT cover the analysis
   *  that follows — that runs on after the card is surfaced. */
  isCreating: boolean;
  create: () => Promise<void>;
}

/**
 * Creates a dashboard for a map area and seeds it with one non-generative
 * insight, then surfaces the navigation card in chat.
 *
 * Ordering is deliberate. The card goes up as soon as the dashboard exists,
 * before the analysis is run: the analysis is a long-running job (submit, then
 * poll to completion) and blocking the card on it would leave the user staring
 * at a dead button for up to a minute. The dashboard is immediately usable, and
 * the card's own subtitle ticks from 0 to 1 widget when the insight lands,
 * because attaching it invalidates the dashboard detail query the card reads.
 *
 * Failure is likewise split. A failed create means nothing was persisted, so
 * there is no card and the user just sees the error. A failed analysis means
 * the dashboard exists and is already on screen — losing the seed insight is a
 * degraded result, not a failed one, so it only warns.
 */
export function useCreateDashboardForArea(
  input: CreateDashboardForAreaInput | null
): CreateDashboardForArea {
  const { data: dashboards, isPending } = useDashboards();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const existing = useMemo(() => {
    if (!dashboards || !input) return undefined;
    return findDashboardForArea(dashboards, {
      source: input.source,
      srcId: input.srcId,
      name: input.areaName,
    });
  }, [dashboards, input]);

  const create = async () => {
    if (!input || isCreating) return;
    setIsCreating(true);

    let dashboard: Dashboard;
    try {
      // No `name` in the payload: the backend titles the dashboard after its
      // AOI, which is what "titled by the area" asks for.
      dashboard = await createDashboard({
        aois: [
          {
            source: input.source,
            src_id: input.srcId,
            subtype: input.subtype,
            name: input.areaName,
          },
        ],
      });
    } catch (err) {
      toaster.create({
        title: "Could not create dashboard",
        description: (err as Error).message,
        type: "error",
        duration: 5000,
      });
      setIsCreating(false);
      return;
    }

    // Write the new dashboard into the list cache before re-enabling the
    // button. `existing` is derived from that list, so invalidating alone would
    // leave it null until the refetch lands, and a second click in that window
    // would create a duplicate dashboard for the same AOI. Seeding it makes the
    // control flip to "Open …" in the same render that frees it.
    queryClient.setQueryData<Dashboard[]>(dashboardKeys.all, (previous) =>
      previous ? [...previous, dashboard] : [dashboard]
    );
    queryClient.setQueryData(dashboardKeys.detail(dashboard.id), dashboard);
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    useChatStore.getState().addDashboardCard(dashboard.id, dashboard.name);
    setIsCreating(false);

    if (input.datasetId === undefined) return;

    // Deliberately not awaited by the caller and not tied to an AbortController:
    // the user is free to navigate into the dashboard (or away) while this runs,
    // and the insight should still land.
    try {
      const result = await analysisService.run({
        area: {
          name: input.areaName,
          source: input.source,
          srcId: input.srcId,
          subtype: input.subtype,
        },
        dataset: { id: input.datasetId, name: input.datasetName },
        // The nudge always supplies a window; the AOI menu may not.
        startDate: input.startDate ?? DEFAULT_ANALYSIS_START_DATE,
        endDate: input.endDate ?? DEFAULT_ANALYSIS_END_DATE,
      });
      await addInsightWidget(dashboard.id, result.id);
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.detail(dashboard.id),
      });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    } catch {
      toaster.create({
        title: "Dashboard created without its first insight",
        description:
          "The analysis couldn't be added. Open the dashboard and try adding it there.",
        type: "warning",
        duration: 6000,
      });
    }
  };

  return { existing, isResolving: isPending, isCreating, create };
}
