import type { ReactNode } from "react";
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

interface PanelToggleButtonProps extends ButtonProps {
  icon: ReactNode;
  label: string;
  /** The panel this button opens is open: primary border/text, aria-expanded. */
  active?: boolean;
}

/** Composer-style outline button that opens a side panel. */
export function PanelToggleButton({
  icon,
  label,
  active,
  ...props
}: PanelToggleButtonProps) {
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
      aria-label={label}
      {...props}
    >
      {icon}
      {label}
    </Button>
  );
}

interface ContextButtonProps extends ButtonProps {
  contextType?: ChatContextType;
  active?: boolean;
}

function ContextButton({ contextType = "area", ...props }: ContextButtonProps) {
  const { icon, label } = ChatContextOptions[contextType];
  return <PanelToggleButton icon={icon} label={label} {...props} />;
}
export default ContextButton;
