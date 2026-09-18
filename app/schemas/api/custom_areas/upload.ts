import { z } from "zod";

export const UploadCustomAreasResponseSchema = z.object({
  upload_batch_id: z.string(),
  areas: z.array(z.object({ id: z.string(), name: z.string() })),
});

export type UploadCustomAreasResponse = z.infer<
  typeof UploadCustomAreasResponseSchema
>;
