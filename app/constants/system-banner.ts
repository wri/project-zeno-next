// Content and coordination constants for the site-wide rebrand announcement
// banner (the "Global Forest Watch is becoming Global Nature Watch" message).
// Shared so the banner and the preview DisclaimerPanel agree on a single
// localStorage key and dismissal event (see SystemBanner + DisclaimerPanel).

// Bump the version suffix to re-surface the banner for everyone after edits.
export const SYSTEM_BANNER_STORAGE_KEY = "gnw_rebrand_banner_dismissed_v1";

// Fired on `window` when the (dismissible) banner is closed so the preview
// disclaimer it supersedes can take over.
export const SYSTEM_BANNER_DISMISSED_EVENT = "gnw-system-banner-dismissed";

export const SYSTEM_BANNER_HEADING =
  "Global Forest Watch is becoming Global Nature Watch.";

export const SYSTEM_BANNER_BODY =
  "This change reflects expanded monitoring capabilities to reach ecosystems beyond forests while integrating new technologies. The AI-driven platform preview you are exploring today is an important part of that vision and, as part of this evolution, is becoming Global Nature Watch Horizon.";

// Rendered on its own line, below a divider, beneath the announcement body.
export const SYSTEM_BANNER_PREVIEW_NOTE =
  "Horizon's AI-generated summaries can be incomplete or incorrect, and important findings should be verified against the source data.";

export const SYSTEM_BANNER_LINK_LABEL = "Learn More";

export const SYSTEM_BANNER_LINK_URL =
  "https://www.globalforestwatch.org/blog/data-and-tools/gfw-now-global-nature-watch/?utm_medium=notification&utm_source=homepage&utm_campaign=gnwannoucement";
