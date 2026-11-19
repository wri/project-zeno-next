import { Link } from "@chakra-ui/react";
import {
  PREVIEW_FEEDBACK_FORM,
  PREVIEW_HELP_CENTER_URL,
} from "@/app/constants/preview-content";
import { Trans } from "@/src/shared/lib/i18n";

/**
 * The feedback and Help Center sentences shared by the preview disclaimer and
 * the preview info panel. Each message wraps its link text in `<a>`, so a
 * translation keeps the link and its words together.
 */
export default function PreviewSupportLinks({
  linkColor,
}: {
  linkColor: string;
}) {
  const link = (href: string) => (
    <Link
      color={linkColor}
      textDecoration="underline"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    />
  );

  return (
    <>
      <Trans
        i18nKey="preview.feedback"
        components={{ a: link(PREVIEW_FEEDBACK_FORM) }}
      />
      <br />
      <Trans
        i18nKey="preview.help"
        components={{ a: link(PREVIEW_HELP_CENTER_URL) }}
      />
    </>
  );
}
