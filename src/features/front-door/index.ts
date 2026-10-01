/**
 * Public API of the `front-door` feature (FSD slice).
 *
 * The lower-friction way into GNW: after the Resource Watch sign-in, one
 * consent screen, then the first answer; the profile is asked for later, in
 * the chat, and prefilled from MyGFW when possible. Wired into the app behind
 * NEXT_PUBLIC_FRONT_DOOR (see app/config/front-door.ts) and composed offline in
 * /onboarding-debug/front-door. Consumers import ONLY from this barrel.
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
export { WelcomeConsent, type WelcomeConsentProps } from "./ui/WelcomeConsent";
export { TermsConsentLabel } from "./ui/TermsConsentLabel";
export {
  ProfilePromptCard,
  type ProfilePromptCardProps,
} from "./ui/ProfilePromptCard";
export {
  ProfileNudgeBanner,
  type ProfileNudgeBannerProps,
} from "./ui/ProfileNudgeBanner";
export {
  CompleteProfileMenuItem,
  type CompleteProfileMenuItemProps,
} from "./ui/CompleteProfileMenuItem";
export {
  EMPTY_PROFILE_ASK_RECORD,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  recordAnswer,
  recordAskDismissed,
  recordAskShown,
  startNewSession,
  type ProfileAskMoment,
  type ProfileAskRecord,
} from "./model/profile-ask";
export {
  profileCardMode,
  type ProfileCardOptions,
  type ProfileCardPatch,
  type ProfileSuggestion,
} from "./model/profile-card";
export { pendingPrompt } from "./lib/pending-prompt";
export { personNames } from "./lib/person-names";
