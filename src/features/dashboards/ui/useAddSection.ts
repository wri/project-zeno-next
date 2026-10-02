import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toaster } from "@/app/components/ui/toaster";
import { addSection } from "../api/dashboards";
import type { Dashboard } from "../api/schemas";
import { dashboardKeys } from "../hooks/dashboardKeys";
import { scrollToSectionWhenRendered } from "./scrollToSection";

/**
 * "Create new section" — an empty section, appended after the last one. The
 * POST response lists every section (though not the widgets' insights), and a
 * new section holds no widgets, so its sections replace the cached ones: no
 * refetch of the full dashboard.
 *
 * The scroll and the error toast live on the hook, not the caller: on an empty
 * dashboard the new section swaps the hero for the grid, unmounting the card
 * that asked, and a `mutate` callback would never run.
 */
export function useAddSection(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => addSection(dashboardId, title),
    onSuccess: ({ sections }) => {
      queryClient.setQueryData<Dashboard>(
        dashboardKeys.detail(dashboardId),
        (cached) => cached && { ...cached, sections }
      );
      const added = sections.reduce<(typeof sections)[number] | undefined>(
        (last, s) => (!last || s.position > last.position ? s : last),
        undefined
      );
      if (added) scrollToSectionWhenRendered(added.id);
    },
    onError: (error) =>
      toaster.create({
        title: "Couldn't create a section",
        description:
          error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 4000,
      }),
  });
}
