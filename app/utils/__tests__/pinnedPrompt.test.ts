import { describe, it, expect } from "vitest";
import {
  resolvePinnedPromptId,
  PIN_CONTEXT_ZONE_PX,
  PromptRect,
} from "../pinnedPrompt";

const CONTAINER_TOP = 100;

function rect(id: string, top: number, bottom: number): PromptRect {
  return { id, top, bottom };
}

describe("resolvePinnedPromptId", () => {
  it("returns null when there are no prompts", () => {
    expect(resolvePinnedPromptId([], CONTAINER_TOP)).toBeNull();
  });

  it("returns null when no prompt has scrolled above the container top", () => {
    const prompts = [rect("a", 300, 350)];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBeNull();
  });

  it("pins a prompt once it has fully scrolled above the container top", () => {
    const prompts = [rect("a", -50, 60)];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBe("a");
  });

  it("treats a prompt whose bottom sits exactly at the container top as scrolled out", () => {
    const prompts = [rect("a", 40, CONTAINER_TOP)];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBe("a");
  });

  it("pins the most recent prompt when several have scrolled out", () => {
    const prompts = [
      rect("a", -400, -300),
      rect("b", -200, -100),
      rect("c", 400, 460),
    ];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBe("b");
  });

  it("yields (returns null) while a prompt bubble is visible inside the context zone", () => {
    const inZone = CONTAINER_TOP + PIN_CONTEXT_ZONE_PX / 2;
    const prompts = [rect("a", -200, -100), rect("b", inZone, inZone + 50)];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBeNull();
  });

  it("yields while a tall prompt bubble straddles the container top edge", () => {
    const prompts = [rect("a", CONTAINER_TOP - 40, CONTAINER_TOP + 200)];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBeNull();
  });

  it("keeps the previous prompt pinned once the next bubble is below the context zone", () => {
    const belowZone = CONTAINER_TOP + PIN_CONTEXT_ZONE_PX;
    const prompts = [
      rect("a", -200, -100),
      rect("b", belowZone, belowZone + 50),
    ];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBe("a");
  });

  it("ignores prompts after the first one still on screen", () => {
    const prompts = [
      rect("a", -200, -100),
      rect("b", 500, 560),
      rect("c", 700, 760),
    ];
    expect(resolvePinnedPromptId(prompts, CONTAINER_TOP)).toBe("a");
  });

  it("measures against the provided container top, not the viewport origin", () => {
    const prompts = [rect("a", 10, 40)];
    // Above a container whose top edge is at y=50 → pinned.
    expect(resolvePinnedPromptId(prompts, 50)).toBe("a");
    // Same rect inside a container starting at y=0 → visible in zone → yields.
    expect(resolvePinnedPromptId(prompts, 0)).toBeNull();
  });
});
