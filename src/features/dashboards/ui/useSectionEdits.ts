import { toaster } from "@/app/components/ui/toaster";
import { deleteSection, updateSection } from "../api/dashboards";
import { withSectionRemoved } from "../model/dashboard-sections";
import { useOptimisticDashboardMutation } from "./dashboardQueries";

const toastError = (title: string) => (error: Error) =>
  toaster.create({
    title,
    description: error.message || "Please try again.",
    type: "error",
    duration: 4000,
  });

/** Retitles a section, optimistically; a failure rolls back and toasts. */
export function useRenameSection(dashboardId: string) {
  return useOptimisticDashboardMutation(
    dashboardId,
    ({ sectionId, title }: { sectionId: string; title: string }) =>
      updateSection(dashboardId, sectionId, { title }),
    (dashboard, { sectionId, title }) => ({
      ...dashboard,
      sections: dashboard.sections.map((s) =>
        s.id === sectionId ? { ...s, title } : s
      ),
    }),
    toastError("Couldn't rename the section")
  );
}

/**
 * Deletes a section, optimistically (`withSectionRemoved`: with
 * `deleteWidgets` its widgets go too, without they drop to the top level).
 * The toast sits on the mutation: deleting the dashboard's last section can
 * swap the grid for the empty-state hero before a failure comes back.
 */
export function useDeleteSection(dashboardId: string) {
  return useOptimisticDashboardMutation(
    dashboardId,
    ({
      sectionId,
      deleteWidgets,
    }: {
      sectionId: string;
      deleteWidgets: boolean;
    }) => deleteSection(dashboardId, sectionId, deleteWidgets),
    (dashboard, { sectionId, deleteWidgets }) =>
      withSectionRemoved(dashboard, sectionId, deleteWidgets),
    toastError("Couldn't delete the section")
  );
}
