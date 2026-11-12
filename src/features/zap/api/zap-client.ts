import { apiFetch } from "@/app/lib/api-client";

import type { ZapChoose, ZapCurrent, ZapPlan } from "../model/zap-plan";

/**
 * Asks the backend to plan the changes for one prompt. `choose` holds the
 * options that the user selected in a preview; it is sent only when set, so
 * an older backend gets the same body as before.
 */
export async function fetchZapPlan(
  prompt: string,
  current: ZapCurrent,
  choose?: ZapChoose
): Promise<ZapPlan> {
  const response = await apiFetch("/api/zap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, current, ...(choose ? { choose } : {}) }),
  });
  if (!response.ok) {
    throw new Error(`Zap failed (${response.status})`);
  }
  return (await response.json()) as ZapPlan;
}
