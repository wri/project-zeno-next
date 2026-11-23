import type {
  UserModel,
  UserModelSchema,
} from "@/app/schemas/api/admin/users/get";
import { rowsToCsv } from "@/src/shared/lib/csv";
import { todayIso } from "@/src/shared/lib/iso-date";

// The backend export's columns in its order, each with the field it reads,
// so an unfiltered download matches the server's file.
const CSV_COLUMNS = {
  id: "id",
  name: "name",
  email: "email",
  created_at: "createdAt",
  updated_at: "updatedAt",
  user_type: "userType",
  first_name: "firstName",
  last_name: "lastName",
  profile_description: "profileDescription",
  sector_code: "sectorCode",
  role_code: "roleCode",
  job_title: "jobTitle",
  company_organization: "companyOrganization",
  country_code: "countryCode",
  preferred_language_code: "preferredLanguageCode",
  gis_expertise_level: "gisExpertiseLevel",
  areas_of_interest: "areasOfInterest",
  has_profile: "hasProfile",
  topics: "topics",
  receive_news_emails: "receiveNewsEmails",
  help_test_features: "helpTestFeatures",
  terms_accepted_at: "termsAcceptedAt",
  terms_version: "termsVersion",
  first_seen_at: "firstSeenAt",
  rw_apps: "rwApps",
} as const satisfies Record<string, keyof typeof UserModelSchema.shape>;

/**
 * The users as CSV, one row each in the given order. Empty for null,
 * "true" or "false" for booleans, lists joined with ";", and dates as the
 * API sent them.
 */
export function usersToCsv(users: readonly UserModel[]): string {
  const rows = users.map((user) =>
    Object.fromEntries(
      Object.entries(CSV_COLUMNS).map(([column, field]) => {
        const value = user[field];
        return [column, Array.isArray(value) ? value.join(";") : value];
      })
    )
  );
  return rowsToCsv(rows, Object.keys(CSV_COLUMNS));
}

export const usersCsvFilename = (filtered: boolean, today = todayIso()) =>
  `gnw-users-${filtered ? "filtered-" : ""}${today}.csv`;
