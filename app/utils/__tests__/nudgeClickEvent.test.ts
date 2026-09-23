import { describe, expect, it } from "vitest";
import { toNudgeClickEvent } from "../nudgeClickEvent";

describe("toNudgeClickEvent", () => {
  it("keeps the dataset_choice payload exactly as before for a backed option", () => {
    const event = toNudgeClickEvent(
      {
        type: "dataset_choice",
        options: ["Tree cover loss", "Land cover change"],
        data: [
          { dataset_id: 4, dataset_name: "Tree cover loss", reason: "r" },
          { dataset_id: 1, dataset_name: "Land cover change", reason: "r" },
        ],
      },
      1
    );
    expect(event).toStrictEqual({
      event: "nudge_click",
      nudge_type: "dataset_choice",
      dataset_name: "Land cover change",
      dataset_id: 1,
    });
  });

  it("falls back to the option text for a dataset_choice with no data entry", () => {
    expect(
      toNudgeClickEvent({ type: "dataset_choice", options: ["Grasslands"] }, 0)
    ).toStrictEqual({
      event: "nudge_click",
      nudge_type: "dataset_choice",
      dataset_name: "Grasslands",
      dataset_id: undefined,
    });
  });

  it.each(["aoi_choice", "dashboard_choice", "insight_choice"])(
    "reports the known backend type %s as its own nudge_type",
    (type) => {
      expect(toNudgeClickEvent({ type, options: ["A", "B"] }, 1)).toStrictEqual(
        {
          event: "nudge_click",
          nudge_type: type,
          agent_nudge_type: type,
          option_index: 1,
          option_text: "B",
        }
      );
    }
  );

  it.each(["confirm", "", "follow_up"])(
    "collapses the ad hoc type %j to agent_other and keeps the raw type",
    (type) => {
      expect(toNudgeClickEvent({ type, options: ["Yes"] }, 0)).toStrictEqual({
        event: "nudge_click",
        nudge_type: "agent_other",
        agent_nudge_type: type,
        option_index: 0,
        option_text: "Yes",
      });
    }
  );
});
