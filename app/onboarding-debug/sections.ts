/** The sections of /onboarding-debug, in page order, for the jump links. */
export const DEBUG_SECTIONS = {
  form: { id: "onboarding-form", label: "Onboarding form" },
  terms: { id: "accept-terms", label: "Accept the terms" },
  profileCard: { id: "profile-card", label: "Profile card" },
  banner: { id: "nudge-banner", label: "Soft nudge banner" },
  accountMenu: { id: "account-menu", label: "Account menu reminder" },
} as const;

/** Leaves room for the sticky jump-link bar when a section is scrolled to. */
export const DEBUG_NAV_OFFSET = "72px";
