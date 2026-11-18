// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const guard = vi.hoisted(() => ({ ready: true }));

vi.mock("@/app/hooks/useAuthGuard", () => ({
  useAuthGuard: () => guard.ready,
}));
vi.mock("@/app/components/PageHeader", () => ({ default: () => null }));
vi.mock("@/src/features/dashboards", () => ({
  SubscriptionsPage: () => <p>subscriptions</p>,
}));

import SubscriptionsRoute from "../page";

describe("/subscriptions route", () => {
  beforeEach(() => {
    guard.ready = true;
  });

  it("shows the page", () => {
    render(<SubscriptionsRoute />);
    expect(screen.getByText("subscriptions")).toBeTruthy();
  });

  it("renders nothing until signed in", () => {
    guard.ready = false;
    const { container } = render(<SubscriptionsRoute />);
    expect(container.innerHTML).toBe("");
  });
});
