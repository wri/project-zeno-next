import useAuthStore from "../store/authStore";

/** Share of the daily quota at which the header starts showing the meter. */
export const PROMPT_METER_THRESHOLD = 0.75;

/**
 * Quotas above this are effectively unlimited (internal/admin accounts); they
 * never get the "running low" meter.
 */
export const UNLIMITED_PROMPTS_THRESHOLD = 5000;

/**
 * Whether the header's "X / Y daily prompts" meter should show: the user has
 * used at least 75% of a real (non-unlimited) daily quota.
 */
export function shouldShowPromptMeter(used: number, total: number): boolean {
  if (total <= 0 || total > UNLIMITED_PROMPTS_THRESHOLD) return false;
  return used / total >= PROMPT_METER_THRESHOLD;
}

/**
 * Derives the prompt-quota state the chat panels and header need: the raw
 * counts, whether the user has hit today's limit, and whether they are close
 * enough to it to warn in the header. Centralised so these comparisons can't
 * drift between consumers.
 */
export function usePromptQuota() {
  const { usedPrompts, totalPrompts } = useAuthStore();
  return {
    usedPrompts,
    totalPrompts,
    promptsExhausted: usedPrompts >= totalPrompts,
    showPromptMeter: shouldShowPromptMeter(usedPrompts, totalPrompts),
  };
}
