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
export {
  ProfilePromptMessage,
  type ProfilePromptMessageProps,
} from "./ui/ProfilePromptMessage";
export { WelcomeConsent, type WelcomeConsentProps } from "./ui/WelcomeConsent";
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
  type ProfilePromptData,
  type ProfileSuggestion,
} from "./model/profile-card";
export { continueUrl, pendingPrompt } from "./lib/continue-url";
