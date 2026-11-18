import { describe, expect, it } from "vitest";

import type { Dashboard } from "../../api/schemas";
import { hasEmailOn, toSubscriptionRows } from "../subscription-rows";

function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: "d1",
    user_id: "user-1",
    name: "Paraná",
    is_public: false,
    eligible_for_subscription: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    aois: [
      {
        id: "a1",
        position: 0,
        source: "gadm",
        src_id: "BRA.16_1",
        subtype: "state-province",
        name: "Paraná, Brazil",
      },
    ],
    sections: [],
    widgets: [],
    subscriptions: { emailEnabled: true },
    ...overrides,
  };
}

describe("toSubscriptionRows", () => {
  it("describes each owned dashboard", () => {
    expect(toSubscriptionRows([dashboard()])).toEqual([
      {
        id: "d1",
        name: "Paraná",
        area: "State or province · BRA",
        emailOn: true,
        eligible: true,
      },
    ]);
  });

  it("leaves out dashboards whose subscription state was not sent", () => {
    const rows = toSubscriptionRows([dashboard({ subscriptions: undefined })]);

    expect(rows).toEqual([]);
  });

  it("keeps an ineligible dashboard, always off", () => {
    const [row] = toSubscriptionRows([
      dashboard({ eligible_for_subscription: false }),
    ]);

    expect(row).toMatchObject({ eligible: false, emailOn: false });
  });
});

describe("hasEmailOn", () => {
  it("is true when any row has email on", () => {
    const rows = toSubscriptionRows([
      dashboard({ subscriptions: { emailEnabled: false } }),
      dashboard({ id: "d2" }),
    ]);

    expect(hasEmailOn(rows)).toBe(true);
    expect(hasEmailOn(rows.slice(0, 1))).toBe(false);
    expect(hasEmailOn([])).toBe(false);
  });
});
