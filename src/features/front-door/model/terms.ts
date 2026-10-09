/**
 * The documents the Welcome screen asks people to accept. Same links, same
 * order as the consent checkbox on today's /onboarding form, so moving consent
 * to the Welcome screen doesn't change what people agree to.
 */
export interface TermsLink {
  label: string;
  href: string;
}

export const WRI_TERMS_OF_USE: TermsLink = {
  label: "Terms of Use",
  href: "https://www.wri.org/about/legal/general-terms-use",
};

export const GNW_AI_TERMS_OF_USE: TermsLink = {
  label: "Global Nature Watch AI Terms of Use",
  href: "https://help.horizon.globalnaturewatch.org/global-nature-watch-ai-terms-of-use",
};

export const WRI_PRIVACY_POLICY: TermsLink = {
  label: "Privacy Policy",
  href: "https://www.wri.org/about/privacy-policy",
};

export const GNW_AI_PRIVACY_POLICY: TermsLink = {
  label: "Global Nature Watch AI Privacy Policy",
  href: "https://help.horizon.globalnaturewatch.org/legal-notices/global-nature-watch-ai-privacy-notice",
};
