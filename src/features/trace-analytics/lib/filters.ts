/** Machine/internal user exclusion (parity with tracey's shared_ui filters). */

import internalUsersFixture from "../fixtures/internal-users.json";

const INTERNAL_USER_IDS: ReadonlySet<string> = new Set(
  (internalUsersFixture.internal_users ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean)
);

/** Machine accounts embed "machine" in their user id. */
export function isMachineUserId(userId: string | null | undefined): boolean {
  return String(userId ?? "")
    .toLowerCase()
    .includes("machine");
}

export function isInternalUserId(userId: string | null | undefined): boolean {
  return INTERNAL_USER_IDS.has(String(userId ?? "").trim());
}

export interface UserFilterOptions {
  readonly excludeInternal: boolean;
}

/** True when the row/session should be kept for analytics. */
export function keepUserId(
  userId: string | null | undefined,
  options: UserFilterOptions
): boolean {
  if (isMachineUserId(userId)) return false;
  if (options.excludeInternal && isInternalUserId(userId)) return false;
  return true;
}

export const internalUserCount = INTERNAL_USER_IDS.size;
