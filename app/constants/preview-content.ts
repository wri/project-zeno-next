export const PREVIEW_FEEDBACK_FORM =
  "https://globalnaturewatch.zendesk.com/hc/en-us/requests/new";

export const PREVIEW_HELP_CENTER_URL =
  "https://help.horizon.globalnaturewatch.org/";

/** Labels live in the i18n catalogs as `header.preview.<id>`. */
export const PREVIEW_LINKS = [
  {
    id: "faqs",
    href: "https://help.horizon.globalnaturewatch.org/support/faqs",
  },
  {
    id: "capabilities",
    href: "https://help.horizon.globalnaturewatch.org/get-started/capabilities-and-datasets",
  },
  {
    id: "accuracy",
    href: "https://help.horizon.globalnaturewatch.org/get-started/accuracy-and-performance",
  },
  {
    id: "knownIssues",
    href: "https://help.horizon.globalnaturewatch.org/resources/known-issues",
  },
] as const;
