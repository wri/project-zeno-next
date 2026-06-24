import { describe, expect, it, vi } from "vitest";
import { LROAnalysisService } from "../lro-analysis-service";
import type { AnalysisGateway, JobResource } from "../analysis-gateway";
import type { Clock } from "../clock";
import type { AnalysisSelection } from "../analysis-selection";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SELECTION: AnalysisSelection = {
  area: { name: "Brazil", source: "gadm", srcId: "BRA", subtype: "country" },
  dataset: { id: 4 },
  startDate: "2020-01-01",
  endDate: "2022-12-31",
};

const JOB_ID = "job-123";
const RESOURCE_URL = "/api/insights/insight-456";

const COMPLETED_RESOURCE: JobResource = {
  id: "res-1",
  resourceUrl: RESOURCE_URL,
  status: "completed",
};

const STUB_RESULT = { id: "insight-456", charts: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────

class NoopClock implements Clock {
  wait(): Promise<void> {
    return Promise.resolve();
  }
}

function makeGateway(
  overrides: Partial<AnalysisGateway> = {}
): AnalysisGateway {
  return {
    submit: vi.fn().mockResolvedValue({ id: JOB_ID }),
    poll: vi.fn().mockResolvedValue({
      status: "completed",
      resources: [COMPLETED_RESOURCE],
    }),
    fetchResult: vi.fn().mockResolvedValue(STUB_RESULT),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LROAnalysisService", () => {
  it("submits the selection and returns the fetched result", async () => {
    const gateway = makeGateway();
    const service = new LROAnalysisService(gateway, new NoopClock());

    const result = await service.run(SELECTION);

    expect(gateway.submit).toHaveBeenCalledWith(SELECTION, undefined);
    expect(gateway.fetchResult).toHaveBeenCalledWith(RESOURCE_URL, undefined);
    expect(result.id).toBe("insight-456");
  });

  it("polls once when the job completes immediately", async () => {
    const gateway = makeGateway();
    const service = new LROAnalysisService(gateway, new NoopClock());

    await service.run(SELECTION);

    expect(gateway.poll).toHaveBeenCalledTimes(1);
    expect(gateway.poll).toHaveBeenCalledWith(JOB_ID, undefined);
  });

  it("waits and retries when the job is pending", async () => {
    const gateway = makeGateway({
      poll: vi
        .fn()
        .mockResolvedValueOnce({ status: "pending", retryAfterSecs: 5 })
        .mockResolvedValueOnce({
          status: "completed",
          resources: [COMPLETED_RESOURCE],
        }),
    });
    const clock = new NoopClock();
    const waitSpy = vi.spyOn(clock, "wait");
    const service = new LROAnalysisService(gateway, clock);

    await service.run(SELECTION);

    expect(gateway.poll).toHaveBeenCalledTimes(2);
    expect(waitSpy).toHaveBeenCalledWith(5, undefined);
  });

  it("waits and retries when the job is running", async () => {
    const gateway = makeGateway({
      poll: vi
        .fn()
        .mockResolvedValueOnce({ status: "running", retryAfterSecs: 3 })
        .mockResolvedValueOnce({ status: "running", retryAfterSecs: 3 })
        .mockResolvedValueOnce({
          status: "completed",
          resources: [COMPLETED_RESOURCE],
        }),
    });
    const clock = new NoopClock();
    const waitSpy = vi.spyOn(clock, "wait");
    const service = new LROAnalysisService(gateway, clock);

    await service.run(SELECTION);

    expect(gateway.poll).toHaveBeenCalledTimes(3);
    expect(waitSpy).toHaveBeenCalledTimes(2);
    expect(waitSpy).toHaveBeenCalledWith(3, undefined);
  });

  it("does not call clock.wait when the job completes on the first poll", async () => {
    const clock = new NoopClock();
    const waitSpy = vi.spyOn(clock, "wait");
    const service = new LROAnalysisService(makeGateway(), clock);

    await service.run(SELECTION);

    expect(waitSpy).not.toHaveBeenCalled();
  });

  it("enriches the result with provenance params from the selection", async () => {
    const service = new LROAnalysisService(makeGateway(), new NoopClock());

    const result = await service.run(SELECTION);

    expect(result.params).toEqual({
      source: "gadm",
      srcId: "BRA",
      subtype: "country",
      name: "Brazil",
    });
  });

  it("throws when submit fails", async () => {
    const gateway = makeGateway({
      submit: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const service = new LROAnalysisService(gateway, new NoopClock());

    await expect(service.run(SELECTION)).rejects.toThrow("Network error");
  });

  it("throws when poll fails", async () => {
    const gateway = makeGateway({
      poll: vi.fn().mockRejectedValue(new Error("Poll error")),
    });
    const service = new LROAnalysisService(gateway, new NoopClock());

    await expect(service.run(SELECTION)).rejects.toThrow("Poll error");
  });

  it("throws when the job completes with no resources", async () => {
    const gateway = makeGateway({
      poll: vi.fn().mockResolvedValue({ status: "completed", resources: [] }),
    });
    const service = new LROAnalysisService(gateway, new NoopClock());

    await expect(service.run(SELECTION)).rejects.toThrow(/no resources/);
  });

  it("throws when fetchResult fails", async () => {
    const gateway = makeGateway({
      fetchResult: vi.fn().mockRejectedValue(new Error("Fetch error")),
    });
    const service = new LROAnalysisService(gateway, new NoopClock());

    await expect(service.run(SELECTION)).rejects.toThrow("Fetch error");
  });

  it("throws after exceeding the timeout budget", async () => {
    // timeout: 10 s, each Retry-After: 4 s
    // poll 1 → waited=4 (<10), wait; poll 2 → waited=8 (<10), wait;
    // poll 3 → waited=12 (>=10), throw before waiting
    const gateway = makeGateway({
      poll: vi.fn().mockResolvedValue({ status: "pending", retryAfterSecs: 4 }),
    });
    const clock = new NoopClock();
    const waitSpy = vi.spyOn(clock, "wait");
    const service = new LROAnalysisService(gateway, clock, 10);

    await expect(service.run(SELECTION)).rejects.toThrow(/10 s/);
    expect(gateway.poll).toHaveBeenCalledTimes(3);
    // waited twice (after polls 1 and 2); threw before the third wait
    expect(waitSpy).toHaveBeenCalledTimes(2);
  });

  it("throws immediately when a single Retry-After value exceeds the timeout", async () => {
    const gateway = makeGateway({
      poll: vi
        .fn()
        .mockResolvedValue({ status: "pending", retryAfterSecs: 99 }),
    });
    const clock = new NoopClock();
    const waitSpy = vi.spyOn(clock, "wait");
    const service = new LROAnalysisService(gateway, clock, 10);

    await expect(service.run(SELECTION)).rejects.toThrow(/10 s/);
    expect(gateway.poll).toHaveBeenCalledTimes(1);
    expect(waitSpy).not.toHaveBeenCalled();
  });

  it("aborts during clock.wait and throws AbortError", async () => {
    const controller = new AbortController();
    // A clock that registers the abort listener first, then triggers the abort,
    // ensuring the event fires and the promise rejects with AbortError.
    const abortingClock: Clock = {
      wait(_secs, signal) {
        return new Promise<void>((_, reject) => {
          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
          // Abort after the listener is in place.
          controller.abort();
        });
      },
    };
    const gateway = makeGateway({
      poll: vi.fn().mockResolvedValue({ status: "pending", retryAfterSecs: 5 }),
    });
    const service = new LROAnalysisService(gateway, abortingClock);

    const err = await service
      .run(SELECTION, controller.signal)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe("AbortError");
  });

  it("aborts during gateway.poll and throws AbortError", async () => {
    const controller = new AbortController();
    const gateway = makeGateway({
      poll: vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      }),
    });
    const service = new LROAnalysisService(gateway, new NoopClock());

    const err = await service
      .run(SELECTION, controller.signal)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe("AbortError");
  });

  it("succeeds when the job completes before the timeout budget is exhausted", async () => {
    // timeout: 10 s, retryAfter: 3 s each
    // poll 1 → waited=3, wait; poll 2 → waited=6, wait; poll 3 → waited=9, wait;
    // poll 4 → completed (budget not checked on a terminal outcome)
    const gateway = makeGateway({
      poll: vi
        .fn()
        .mockResolvedValueOnce({ status: "pending", retryAfterSecs: 3 })
        .mockResolvedValueOnce({ status: "pending", retryAfterSecs: 3 })
        .mockResolvedValueOnce({ status: "pending", retryAfterSecs: 3 })
        .mockResolvedValueOnce({
          status: "completed",
          resources: [COMPLETED_RESOURCE],
        }),
    });
    const service = new LROAnalysisService(gateway, new NoopClock(), 10);

    const result = await service.run(SELECTION);

    expect(result.id).toBe("insight-456");
    expect(gateway.poll).toHaveBeenCalledTimes(4);
  });
});
