import { apiFetch } from "@/app/lib/api-client";

import type { ZapCurrent, ZapPlan } from "../model/zap-plan";

/** Asks the backend to plan the map changes for one prompt. */
export async function fetchZapPlan(
  prompt: string,
  current: ZapCurrent
): Promise<ZapPlan> {
  const response = await apiFetch("/api/zap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, current }),
  });
  if (!response.ok) {
    throw new Error(`Zap failed (${response.status})`);
  }
  return (await response.json()) as ZapPlan;
}
