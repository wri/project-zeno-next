import { Link } from "@chakra-ui/react";
import {
  PREVIEW_FEEDBACK_FORM,
  PREVIEW_HELP_CENTER_URL,
} from "@/app/constants/preview-content";
import { useTranslation } from "@/src/shared/lib/i18n";

/** Marks where the link sits, so a translation can move it in the sentence. */
const LINK_MARK = "";

/**
 * The feedback and Help Center sentences shared by the preview disclaimer and
 * the preview info panel, each with its link wherever the locale puts it.
 */
export default function PreviewSupportLinks({
  linkColor,
}: {
  linkColor: string;
}) {
  const { t } = useTranslation();
  const withLink = (message: string, href: string, label: string) => {
    const [before, after = ""] = message.split(LINK_MARK);
    return (
      <>
        {before}
        <Link
          color={linkColor}
          textDecoration="underline"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </Link>
        {after}
      </>
    );
  };

  return (
    <>
      {withLink(
        t("header.preview.feedback", { link: LINK_MARK }),
        PREVIEW_FEEDBACK_FORM,
        t("header.preview.feedbackLink")
      )}
      <br />
      {withLink(
        t("header.preview.help", { link: LINK_MARK }),
        PREVIEW_HELP_CENTER_URL,
        t("header.preview.helpLink")
      )}
    </>
  );
}
