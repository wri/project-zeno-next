"use client";
import { useEffect, useRef } from "react";

import { useAnalysis } from "@/src/features/analysis";

import useZapStore from "../model/zap-store";

/**
 * Render-null runner for the chart step of a zap plan. Mounted once in the
 * (chat) layout, so the analysis keeps running when the panel changes mode
 * or size. Runs the curated analysis the same way as the "View Analysis"
 * nudge, and marks the step done or failed.
 */
export function ZapRunner() {
  const pending = useZapStore((s) => s.pendingAnalysis);
  const { status, run } = useAnalysis();
  const running = useRef<number | null>(null);

  useEffect(() => {
    if (pending === null || running.current === pending) return;
    const step = useZapStore.getState().plan?.steps[pending];
    if (step?.kind !== "analysis") return;
    running.current = pending;
    const { args } = step;
    run({
      area: {
        name: args.area.name,
        source: args.area.source,
        srcId: args.area.src_id,
        subtype: args.area.subtype ?? undefined,
      },
      dataset: { id: args.dataset_id, name: args.dataset_name },
      startDate: args.start_date,
      endDate: args.end_date,
      contextLayer: args.context_layer ?? undefined,
      canopyCover: args.canopy_cover ?? undefined,
    });
  }, [pending, run]);

  useEffect(() => {
    const index = running.current;
    if (index === null || (status !== "done" && status !== "error")) return;
    running.current = null;
    const store = useZapStore.getState();
    store.setStep(index, status === "done" ? "done" : "failed");
    store.finish();
  }, [status]);

  return null;
}
