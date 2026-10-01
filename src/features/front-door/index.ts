/**
 * Public API of the `front-door` feature (FSD slice).
 *
 * The lower-friction way into GNW: after the Resource Watch sign-in, one
 * consent screen, then the first answer; the profile is asked for later, in
 * the chat, and prefilled from MyGFW when possible. Wired into the app behind
 * NEXT_PUBLIC_FRONT_DOOR (see app/config/front-door.ts) and composed offline in
 * /onboarding-debug/front-door. Consumers import ONLY from this barrel, which
 * exports only what the app and the preview use.
 */
export { WelcomePage } from "./ui/WelcomePage";
export { ProfileAskTrigger } from "./ui/ProfileAskTrigger";
export { ProfileNudgeSlot } from "./ui/ProfileNudgeSlot";
export { ProfileIncompleteDot } from "./ui/ProfileIncompleteDot";
export {
  ProfileReminderDot,
  ProfileReminderMenuItem,
} from "./ui/ProfileReminder";
export { ProfilePromptMessage } from "./ui/ProfilePromptMessage";
export { WelcomeConsent } from "./ui/WelcomeConsent";
export { TermsConsentLabel } from "./ui/TermsConsentLabel";
export { ProfilePromptCard } from "./ui/ProfilePromptCard";
export { ProfileNudgeBanner } from "./ui/ProfileNudgeBanner";
export { CompleteProfileMenuItem } from "./ui/CompleteProfileMenuItem";
export {
  EMPTY_PROFILE_ASK_RECORD,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  recordAnswer,
  recordAskDismissed,
  recordAskShown,
  startNewSession,
  type ProfileAskRecord,
} from "./model/profile-ask";
export type { ProfileCardPatch, ProfileSuggestion } from "./model/profile-card";
export { pendingPrompt } from "./lib/pending-prompt";
export { personNames } from "./lib/person-names";
