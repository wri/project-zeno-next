/**
 * Dashboard button text that the onboarding tour's copy names. A leaf module
 * the tour imports directly: through the feature's barrel the import would
 * close a cycle (the dashboard page mounts the chat, which mounts the tour).
 */
export const ADD_TO_DASHBOARD_LABEL = "Add to dashboard";

export const createDashboardNudgeLabel = (areaName: string) =>
  `Create Dashboard for ${areaName}`;

export const DASHBOARD_EXPORT_LABEL = "Export";

export const SAVE_AS_PDF_LABEL = "Save as PDF";
