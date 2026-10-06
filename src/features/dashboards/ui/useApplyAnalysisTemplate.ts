import {
  useMutation,
  useMutationState,
  useQueryClient,
} from "@tanstack/react-query";

import { toaster } from "@/app/components/ui/toaster";
import { applyAnalysisTemplate } from "../api/dashboards";
import { dashboardKeys } from "../hooks/dashboardKeys";
import { templateErrorMessage } from "../lib/analysis-templates";
import { scrollToSectionWhenRendered } from "./scrollToSection";

/**
 * An analysis template card: applies the template (by registry name) with its
 * default arguments. The response carries the expanded dashboard, so it
 * replaces the cached detail directly — no refetch after a request that
 * already took tens of seconds.
 *
 * The follow-up — each warning (an optional widget left out) as a toast, the
 * scroll to the new section, or the failure toast — lives on the hook, not the
 * caller: the card that asked may be gone by then (the empty-state hero swaps
 * for the grid, or the Analyses pane closes).
 */
export function useApplyAnalysisTemplate(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: dashboardKeys.applyTemplate(dashboardId),
    mutationFn: (template: string) =>
      applyAnalysisTemplate(dashboardId, template),
    onSuccess: (result) => {
      queryClient.setQueryData(
        dashboardKeys.detail(dashboardId),
        result.dashboard
      );
      for (const warning of result.warnings) {
        toaster.create({
          title: "Part of the template was left out",
          description: warning,
          type: "warning",
          duration: 8000,
        });
      }
      scrollToSectionWhenRendered(result.section_id);
    },
    onError: (error) =>
      toaster.create({
        ...templateErrorMessage(error),
        type: "error",
        duration: 6000,
      }),
  });
}

/**
 * The templates being applied to this dashboard right now. Read from the
 * mutation cache rather than one hook instance's state, so every card — in the
 * footer and in the Analyses pane, including one mounted after the request
 * started — holds inert while any template request is in flight: two requests
 * would make two sections.
 */
export function usePendingAnalysisTemplates(dashboardId: string): string[] {
  return useMutationState({
    filters: {
      mutationKey: dashboardKeys.applyTemplate(dashboardId),
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as string,
  });
}
