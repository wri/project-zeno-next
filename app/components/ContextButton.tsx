import { Button, ButtonProps } from "@chakra-ui/react";
import {
  CalendarBlankIcon,
  PolygonIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";

export const ChatContextOptions = {
  layer: { icon: <StackSimpleIcon />, label: "Datasets" },
  area: { icon: <PolygonIcon />, label: "Areas" },
  date: { icon: <CalendarBlankIcon />, label: "Date" },
} as const;

export type ChatContextType = keyof typeof ChatContextOptions;

interface ContextButtonProps extends ButtonProps {
  contextType?: ChatContextType;
  /** The panel this button opens is open: primary border/text, aria-expanded. */
  active?: boolean;
}

function ContextButton({
  contextType = "area",
  active,
  ...props
}: ContextButtonProps) {
  return (
    <Button
      size="xs"
      variant="outline"
      borderRadius="sm"
      borderColor={active ? "primary.solid" : "#E0E2E5"}
      color={active ? "primary.solid" : undefined}
      aria-expanded={active}
      borderWidth="1px"
      px="2"
      h="8"
      gap="1"
      fontSize="xs"
      fontWeight="normal"
      aria-label={ChatContextOptions[contextType].label}
      {...props}
    >
      {ChatContextOptions[contextType].icon}
      {ChatContextOptions[contextType].label}
    </Button>
  );
}
export default ContextButton;
