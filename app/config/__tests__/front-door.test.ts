import { afterEach, describe, expect, it, vi } from "vitest";

import { isFrontDoorEnabled } from "../front-door";

describe("isFrontDoorEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is on only for the exact string 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", "true");
    expect(isFrontDoorEnabled()).toBe(true);
  });

  it.each(["", "false", "1", "TRUE", "yes"])("is off for %j", (value) => {
    vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", value);
    expect(isFrontDoorEnabled()).toBe(false);
  });

  it("is off when the variable is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", undefined);
    expect(isFrontDoorEnabled()).toBe(false);
  });
});
