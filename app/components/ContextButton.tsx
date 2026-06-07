import { Button, ButtonProps } from "@chakra-ui/react";
import {
  CalendarBlankIcon,
  PolygonIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";

export const ChatContextOptions = {
  layer: { icon: <StackSimpleIcon />, label: "Open data catalog" },
  area: { icon: <PolygonIcon />, label: "Open area tools" },
  date: { icon: <CalendarBlankIcon />, label: "Date" },
} as const;

export type ChatContextType = keyof typeof ChatContextOptions;

interface ContextButtonProps extends ButtonProps {
  contextType?: ChatContextType;
}

function ContextButton({ contextType = "area", ...props }: ContextButtonProps) {
  return (
    <Button
      size="xs"
      variant="outline"
      borderRadius="sm"
      borderColor="#E0E2E5"
      borderWidth="1px"
      px="2"
      h="8"
      gap="1"
      fontSize="xs"
      fontWeight="normal"
      {...props}
    >
      {ChatContextOptions[contextType].icon}
      {ChatContextOptions[contextType].label}
    </Button>
  );
}
export default ContextButton;
