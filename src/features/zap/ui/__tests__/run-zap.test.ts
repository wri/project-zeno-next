import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ZapPlan } from "../../model/zap-plan";
import useZapStore from "../../model/zap-store";

const fetchZapPlan = vi.fn();
const addDatasetToMap = vi.fn();
const showAoisOnMap = vi.fn();

vi.mock("../../api/zap-client", () => ({
  fetchZapPlan: (...args: unknown[]) => fetchZapPlan(...args),
}));
vi.mock("@/app/store/chat-tools/pickDataset", () => ({
  addDatasetToMap: (...args: unknown[]) => addDatasetToMap(...args),
}));
vi.mock("@/app/store/chat-tools/pickAoi", () => ({
  showAoisOnMap: (...args: unknown[]) => showAoisOnMap(...args),
}));

const { runZap } = await import("../run-zap");

const AREA = {
  name: "Huelva, Andalucía, Spain",
  source: "gadm",
  src_id: "ESP.1.5_1",
  subtype: "state-province",
};

function plan(steps: ZapPlan["steps"]): ZapPlan {
  return { steps, decisions: [], notes: [] };
}

const DATASET_STEP = {
  kind: "dataset" as const,
  title: "Show Tree cover loss",
  detail: "2015–2025",
  args: { dataset_id: 4, dataset_name: "Tree cover loss" } as never,
};
const AREA_STEP = {
  kind: "area" as const,
  title: "Go to Huelva",
  detail: "",
  args: AREA,
};

describe("runZap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useZapStore.getState().reset();
    showAoisOnMap.mockResolvedValue({ successfulAois: [AREA], failures: [] });
  });

  it("runs the steps in order and hands the chart step to the runner", async () => {
    fetchZapPlan.mockResolvedValue(
      plan([
        DATASET_STEP,
        AREA_STEP,
        {
          kind: "analysis",
          title: "Chart Tree cover loss",
          detail: "",
          args: {
            dataset_id: 4,
            dataset_name: "Tree cover loss",
            area: AREA,
            start_date: "2015-01-01",
            end_date: "2025-12-31",
          },
        },
      ])
    );

    const done = runZap("Deforestation in Huelva");
    await vi.runAllTimersAsync();
    await done;

    expect(addDatasetToMap).toHaveBeenCalledWith(DATASET_STEP.args);
    expect(showAoisOnMap).toHaveBeenCalledWith(
      [expect.objectContaining({ src_id: "ESP.1.5_1" })],
      AREA.name
    );
    const state = useZapStore.getState();
    expect(state.stepStatus).toEqual(["done", "done", "running"]);
    expect(state.pendingAnalysis).toBe(2);
    expect(state.status).toBe("running");
  });

  it("skips a chart the backend cannot compute for the area source", async () => {
    fetchZapPlan.mockResolvedValue(
      plan([
        {
          kind: "analysis",
          title: "Chart Tree cover gain",
          detail: "",
          args: {
            dataset_id: 5,
            dataset_name: "Tree cover gain",
            area: { ...AREA, source: "kba" },
            start_date: "2000-01-01",
            end_date: "2020-12-31",
          },
        },
      ])
    );

    const done = runZap("tree cover gain in this KBA");
    await vi.runAllTimersAsync();
    await done;

    const state = useZapStore.getState();
    expect(state.stepStatus).toEqual(["skipped"]);
    expect(state.status).toBe("done");
  });

  it("finishes with no steps when the plan is empty", async () => {
    fetchZapPlan.mockResolvedValue(plan([]));

    await runZap("hello");

    expect(useZapStore.getState().status).toBe("done");
    expect(addDatasetToMap).not.toHaveBeenCalled();
  });

  it("reports a failed plan request", async () => {
    fetchZapPlan.mockRejectedValue(new Error("Zap failed (502)"));

    await runZap("fires");

    const state = useZapStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("Zap failed (502)");
  });
});
