import { describe, expect, it } from "vitest";
import { toggleTopic } from "../TopicPills";

describe("toggleTopic", () => {
  it("adds and removes a topic without changing the old list", () => {
    const before = ["fires"];
    expect(toggleTopic(before, "water")).toEqual(["fires", "water"]);
    expect(toggleTopic(before, "fires")).toEqual([]);
    expect(before).toEqual(["fires"]);
  });
});
