import { apiFetch } from "@/app/lib/api-client";
import { parseAuthMe, type AuthMe } from "@/app/lib/auth-me";
import {
  PatchProfilePartialRequestSchema,
  type PatchProfilePartialRequest,
} from "@/app/schemas/api/auth/profile/patch";
import { ProfileConfigSchema } from "@/app/schemas/api/profile/config";
import type { ProfileCardOptions } from "../model/profile-card";

/**
 * PATCH /api/auth/profile with a partial update (the /welcome consent or the
 * profile card). Returns the updated user, parsed like /api/auth/me, for the
 * caller to put in authStore. Throws on a non-2xx response.
 */
export async function patchProfile(
  patch: PatchProfilePartialRequest
): Promise<AuthMe> {
  const body = PatchProfilePartialRequestSchema.parse(patch);
  const res = await apiFetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to save profile (${res.status})`);
  }
  return parseAuthMe(await res.json());
}

// The subset of GET /api/profile/config the card uses; other keys are dropped.
const ProfileCardOptionsSchema = ProfileConfigSchema.pick({
  sectors: true,
  sector_roles: true,
  countries: true,
  languages: true,
  topics: true,
});

/** GET /api/profile/config (public), narrowed to what the profile card needs. */
export async function fetchProfileCardOptions(): Promise<ProfileCardOptions> {
  const res = await apiFetch("/api/profile/config");
  if (!res.ok) {
    throw new Error(`Failed to load profile options (${res.status})`);
  }
  return ProfileCardOptionsSchema.parse(await res.json());
}
