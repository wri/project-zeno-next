import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { apiFetch } from "@/app/lib/api-client";
import { ProfileConfigSchema } from "@/app/schemas/api/profile/config";
import { responseError } from "./http";

// The code → label maps the table and filters show; other keys are dropped.
const ProfileLabelsSchema = ProfileConfigSchema.pick({
  countries: true,
  sectors: true,
  languages: true,
});
export type ProfileLabels = z.infer<typeof ProfileLabelsSchema>;

async function fetchProfileLabels(): Promise<ProfileLabels> {
  const res = await apiFetch("/api/profile/config");
  if (!res.ok) throw await responseError(res);
  return ProfileLabelsSchema.parse(await res.json());
}

/** Until these load, or if they fail, the page shows the codes. */
export function useProfileLabels() {
  return useQuery({
    queryKey: ["manage-users", "profile-labels"],
    queryFn: fetchProfileLabels,
    // The option lists only change with a deploy.
    staleTime: Infinity,
  });
}
