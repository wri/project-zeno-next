import { Button, ButtonProps } from "@chakra-ui/react";
import {
  CalendarBlankIcon,
  PolygonIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";

export const ChatContextOptions = {
  layer: { icon: <StackSimpleIcon />, label: "Data Layer" },
  area: { icon: <PolygonIcon />, label: "Area" },
  date: { icon: <CalendarBlankIcon />, label: "Date" },
} as const;

export type ChatContextType = keyof typeof ChatContextOptions;

interface ContextButtonProps extends ButtonProps{
  contextType?: ChatContextType;
}

function ContextButton({ contextType = "area", ...props }: ContextButtonProps) {
  return (
    <Button size="xs" variant="surface" borderRadius="full" py="1" h="auto" {...props} >
      {ChatContextOptions[contextType].icon}
      {ChatContextOptions[contextType].label}
    </Button>
  );
}
export default ContextButton;
