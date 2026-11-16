// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const guard = vi.hoisted(() => ({ ready: true, flag: true }));

vi.mock("@/app/hooks/useAuthGuard", () => ({
  useAuthGuard: () => guard.ready,
}));
vi.mock("@/src/shared/lib/feature-flags", () => ({
  useFeatureFlag: () => guard.flag,
}));
vi.mock("@/app/components/PageHeader", () => ({ default: () => null }));
vi.mock("@/app/not-found", () => ({ default: () => <p>not found</p> }));
vi.mock("@/src/features/dashboards", () => ({
  SubscriptionsPage: () => <p>subscriptions</p>,
}));

import SubscriptionsRoute from "../page";

describe("/subscriptions route", () => {
  beforeEach(() => {
    guard.ready = true;
    guard.flag = true;
  });

  it("shows the page with the flag on", () => {
    render(<SubscriptionsRoute />);
    expect(screen.getByText("subscriptions")).toBeTruthy();
  });

  it("is not found with the flag off", () => {
    guard.flag = false;
    render(<SubscriptionsRoute />);
    expect(screen.getByText("not found")).toBeTruthy();
  });

  it("renders nothing until signed in", () => {
    guard.ready = false;
    const { container } = render(<SubscriptionsRoute />);
    expect(container.innerHTML).toBe("");
  });
});
