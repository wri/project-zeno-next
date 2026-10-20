import { IconButton } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

import { Tooltip } from "@/app/components/ui/tooltip";

/**
 * The (i) button on a card. Stops propagation so it never also triggers the
 * card's own click (a row toggle, a link).
 */
export function InfoButton({
  title,
  label,
  onClick,
}: {
  /** The item the button is about; completes the accessible name. */
  title: string;
  /** Tooltip and the start of the accessible name: "{label}: {title}". */
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip
      content={label}
      positioning={{ placement: "top" }}
      showArrow
      variant="dark"
    >
      <IconButton
        aria-label={`${label}: ${title}`}
        size="2xs"
        variant="ghost"
        color="#656E7B"
        flexShrink={0}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <InfoIcon size={16} />
      </IconButton>
    </Tooltip>
  );
}
