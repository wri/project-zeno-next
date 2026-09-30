/**
 * The "front door" flag (`NEXT_PUBLIC_FRONT_DOOR=true`).
 *
 * On: after the Resource Watch sign-in, people accept the terms on /welcome
 * and go straight to their first answer; the profile is asked for later, in
 * the chat (see `src/features/front-door`). Off: the /onboarding form gates
 * /app exactly as before.
 *
 * A function rather than a constant so tests can flip it with `vi.stubEnv`;
 * Next still inlines the `NEXT_PUBLIC_` value at build time.
 */
export function isFrontDoorEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FRONT_DOOR === "true";
}
