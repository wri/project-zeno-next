import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { wait } from "../wait";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("wait", () => {
  it("resolves after the given time", async () => {
    const done = vi.fn();
    void wait(2000).then(done);
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });

  it("rejects with an AbortError when the signal aborts first", async () => {
    const controller = new AbortController();
    const outcome = wait(2000, controller.signal).catch((e: unknown) => e);
    controller.abort();
    expect(await outcome).toMatchObject({ name: "AbortError" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects at once when the signal has already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(wait(2000, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
