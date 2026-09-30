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
  INITIAL_PROFILE_ASK_STATE,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  askMomentAfterAnswer,
  recordProfileAsked,
  recordProfileCompleted,
  recordProfileDismissed,
  shouldAskForProfile,
  showProfileMenuReminder,
  startNewSession,
  type AnswerCounts,
  type ProfileAskMoment,
  type ProfileAskState,
} from "./model/profile-ask";
export {
  profileCardMode,
  type ProfileCardOptions,
  type ProfileCardPatch,
  type ProfilePromptData,
  type ProfileSuggestion,
} from "./model/profile-card";
export { continueUrl, pendingPrompt } from "./lib/continue-url";
