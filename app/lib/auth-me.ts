import { UserTypeEnum, type UserType } from "@/app/schemas/api/admin/users/get";

/** What `AuthBootstrapper` puts in `authStore` from GET /api/auth/me. */
export interface AuthMeStatus {
  email: string;
  id: string;
  hasProfile: boolean;
  userType: UserType | null;
  preferredLanguageCode: string | null;
  /** The Resource Watch display name, e.g. "Maria Silva". */
  name: string | null;
  /**
   * Whether /app may open (front door). The server decides: the terms were
   * accepted on /welcome, or the person completed the old onboarding form,
   * which carried the same checkbox.
   */
  termsAccepted: boolean;
}

export interface AuthMe {
  /** Null when the response carries no email: the session is not signed in. */
  status: AuthMeStatus | null;
  /** Null when the backend reports no quota (quota checking disabled). */
  usage: { used: number; quota: number } | null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * The one place the camelCase user payload is interpreted (GET
 * /api/auth/me, and the PATCH /api/auth/profile response). The
 * coercions for the fields that predate the front door (email truthiness,
 * `id ?? ""`, `Boolean(hasProfile)`, user type, language, quota) are kept
 * exactly as AuthBootstrapper applied them inline.
 */
export function parseAuthMe(data: unknown): AuthMe {
  const raw = (typeof data === "object" && data !== null ? data : {}) as Record<
    string,
    unknown
  >;

  const email = raw.email as string | undefined;
  const status: AuthMeStatus | null = email
    ? {
        email,
        id: (raw.id as string | undefined) ?? "",
        hasProfile: Boolean(raw.hasProfile),
        userType: UserTypeEnum.safeParse(raw.userType).data ?? null,
        preferredLanguageCode: stringOrNull(raw.preferredLanguageCode),
        name: stringOrNull(raw.name),
        termsAccepted: raw.termsAccepted === true,
      }
    : null;

  const used = numberOrNull(raw.promptsUsed);
  const quota = numberOrNull(raw.promptQuota);

  return {
    status,
    usage: quota !== null ? { used: used || 0, quota } : null,
  };
}
