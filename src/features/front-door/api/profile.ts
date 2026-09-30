import { z } from "zod";
import { apiFetch } from "@/app/lib/api-client";
import {
  PatchProfilePartialRequestSchema,
  type PatchProfilePartialRequest,
} from "@/app/schemas/api/auth/profile/patch";
import type { ProfileCardOptions } from "../model/profile-card";

/**
 * PATCH /api/auth/profile with a partial update (the /welcome consent or the
 * profile card). Throws with the HTTP status on a non-2xx response.
 */
export async function patchProfile(
  patch: PatchProfilePartialRequest
): Promise<void> {
  const body = PatchProfilePartialRequestSchema.parse(patch);
  const res = await apiFetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = new Error("Failed to save profile");
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
}

const labels = z.record(z.string(), z.string());

// The subset of GET /api/profile/config the card uses; other keys are dropped.
const ProfileCardOptionsSchema = z.object({
  sectors: labels,
  sector_roles: z.record(z.string(), labels),
  countries: labels,
  languages: labels,
});

/** GET /api/profile/config (public), narrowed to what the profile card needs. */
export async function fetchProfileCardOptions(): Promise<ProfileCardOptions> {
  const res = await apiFetch("/api/profile/config");
  if (!res.ok) {
    throw new Error(`Failed to load profile options (${res.status})`);
  }
  return ProfileCardOptionsSchema.parse(await res.json());
}
