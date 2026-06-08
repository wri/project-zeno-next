import useAuthStore from "../store/authStore";

/**
 * Derives the prompt-quota state both chat panels need: the raw counts plus
 * whether the user has hit today's limit. Centralised so the `usedPrompts >=
 * totalPrompts` comparison can't drift between the compact and full-size
 * panels.
 */
export function usePromptQuota() {
  const { usedPrompts, totalPrompts } = useAuthStore();
  return {
    usedPrompts,
    totalPrompts,
    promptsExhausted: usedPrompts >= totalPrompts,
  };
}
