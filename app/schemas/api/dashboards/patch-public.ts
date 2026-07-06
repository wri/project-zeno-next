import { z } from "zod";

import { DashboardSchema } from "./get";

// Response of PATCH /api/dashboards/{id}/public. Publishing cascades
// is_public to every insight the dashboard references; the response lists
// which insights that touched so the UI can tell the user. Unpublishing does
// NOT make those insights private again.
export const PublishDashboardResponseSchema = DashboardSchema.extend({
  publicized_insight_ids: z.array(z.string()).nullish(),
});

export type PublishDashboardResponse = z.infer<
  typeof PublishDashboardResponseSchema
>;
