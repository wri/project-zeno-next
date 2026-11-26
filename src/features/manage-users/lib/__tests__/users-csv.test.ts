import { describe, expect, it } from "vitest";
import type { UserModel } from "@/app/schemas/api/admin/users/get";
import { usersCsvFilename, usersToCsv } from "../users-csv";

const user = (overrides: Partial<UserModel> = {}): UserModel => ({
  id: "u1",
  email: "ana@example.org",
  userType: "regular",
  ...overrides,
});

// Cells here hold no comma, quote or newline, so a plain split reads them.
function cell(csv: string, column: string): string {
  const [header, row] = csv.split("\n");
  return row.split(",")[header.split(",").indexOf(column)];
}

describe("usersToCsv", () => {
  it("writes the backend export's columns in its order", () => {
    expect(usersToCsv([]).split("\n")).toEqual([
      "id,name,email,created_at,updated_at,user_type,first_name,last_name," +
        "profile_description,sector_code,role_code,job_title," +
        "company_organization,country_code,preferred_language_code," +
        "gis_expertise_level,areas_of_interest,has_profile,topics," +
        "receive_news_emails,help_test_features,terms_accepted_at," +
        "terms_version,first_seen_at,rw_apps",
    ]);
  });

  it.each<[string, Partial<UserModel>, string, string]>([
    ["a string as sent", { jobTitle: "Analyst" }, "job_title", "Analyst"],
    ["null as empty", { jobTitle: null }, "job_title", ""],
    ["an absent field as empty", {}, "job_title", ""],
    ["true", { hasProfile: true }, "has_profile", "true"],
    ["false", { receiveNewsEmails: false }, "receive_news_emails", "false"],
    ["a list joined with ;", { rwApps: ["gfw", "rw"] }, "rw_apps", "gfw;rw"],
    ["an empty list as empty", { topics: [] }, "topics", ""],
    [
      "a date as the API sent it",
      { firstSeenAt: "2026-11-05T10:20:30.123456Z" },
      "first_seen_at",
      "2026-11-05T10:20:30.123456Z",
    ],
    ["the user type", { userType: "pro" }, "user_type", "pro"],
    ["a formula as text", { jobTitle: "=1+2" }, "job_title", "'=1+2"],
  ])("writes %s", (_, overrides, column, expected) => {
    expect(cell(usersToCsv([user(overrides)]), column)).toBe(expected);
  });

  it("quotes a cell with a comma and keeps the row order", () => {
    const csv = usersToCsv([
      user({ id: "u2", name: "Lima, Ana" }),
      user({ id: "u1", name: "Bo" }),
    ]);
    expect(csv.split("\n").map((line) => line.split(",")[0])).toEqual([
      "id",
      "u2",
      "u1",
    ]);
    expect(csv).toContain('u2,"Lima, Ana",');
  });
});

describe("usersCsvFilename", () => {
  it.each([
    [false, "gnw-users-2026-11-23.csv"],
    [true, "gnw-users-filtered-2026-11-23.csv"],
  ])("filtered %s is %s", (filtered, expected) => {
    expect(usersCsvFilename(filtered, "2026-11-23")).toBe(expected);
  });
});
