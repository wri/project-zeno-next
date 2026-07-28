// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import DashboardHeader from "../DashboardHeader";
import type { DashboardMode } from "../../hooks/useDashboardMode";
import type { Dashboard } from "../../api/schemas";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Ucayali Forest Monitor",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [],
  widgets: [],
};

const renderHeader = (props: {
  isOwner: boolean;
  mode: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardHeader
          dashboard={dashboard}
          isOwner={props.isOwner}
          mode={props.mode}
          onModeChange={props.onModeChange ?? (() => {})}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("DashboardHeader mode toggle", () => {
  it("owners get the Edit/Report toggle with the current mode pressed", () => {
    const { getByRole } = renderHeader({ isOwner: true, mode: "edit" });
    const editButton = getByRole("button", { name: /edit/i });
    const reportButton = getByRole("button", { name: /report/i });
    expect(editButton.getAttribute("aria-pressed")).toBe("true");
    expect(reportButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("switching to report fires onModeChange", () => {
    const onModeChange = vi.fn();
    const { getByRole } = renderHeader({
      isOwner: true,
      mode: "edit",
      onModeChange,
    });
    fireEvent.click(getByRole("button", { name: /report/i }));
    expect(onModeChange).toHaveBeenCalledWith("report");
  });

  it("non-owners get no toggle (they are always in report mode)", () => {
    const { queryByRole } = renderHeader({ isOwner: false, mode: "report" });
    expect(queryByRole("group", { name: "Dashboard mode" })).toBeNull();
  });

  it("the rename pencil exists in edit mode only", () => {
    const edit = renderHeader({ isOwner: true, mode: "edit" });
    expect(edit.queryByLabelText("Rename dashboard")).toBeTruthy();
    edit.unmount();

    const report = renderHeader({ isOwner: true, mode: "report" });
    expect(report.queryByLabelText("Rename dashboard")).toBeNull();
  });
});
