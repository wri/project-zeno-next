import type { MessageKey } from "@/src/shared/lib/i18n";

export const PREVIEW_FEEDBACK_FORM =
  "https://globalnaturewatch.zendesk.com/hc/en-us/requests/new";

export const PREVIEW_HELP_CENTER_URL =
  "https://help.horizon.globalnaturewatch.org/";

export const PREVIEW_LINKS = [
  {
    labelKey: "preview.faqs",
    href: "https://help.horizon.globalnaturewatch.org/support/faqs",
  },
  {
    labelKey: "preview.capabilities",
    href: "https://help.horizon.globalnaturewatch.org/get-started/capabilities-and-datasets",
  },
  {
    labelKey: "preview.accuracy",
    href: "https://help.horizon.globalnaturewatch.org/get-started/accuracy-and-performance",
  },
  {
    labelKey: "preview.knownIssues",
    href: "https://help.horizon.globalnaturewatch.org/resources/known-issues",
  },
] as const satisfies readonly { labelKey: MessageKey; href: string }[];
