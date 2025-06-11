import { Button } from "@chakra-ui/react";
import {
  CalendarBlankIcon,
  PolygonIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";

export const ChatContextOptions = {
  area: { icon: <PolygonIcon />, label: "Area" },
  layer: { icon: <StackSimpleIcon />, label: "Data Layer" },
  date: { icon: <CalendarBlankIcon />, label: "Date" },
} as const;

export type ChatContextType = keyof typeof ChatContextOptions;

interface ContextButtonProps {
  contextType?: ChatContextType;
}

function ContextButton({ contextType = "area" }: ContextButtonProps) {
  return (
    <Button size="xs" variant="surface" borderRadius="full" py="1" h="auto">
      {ChatContextOptions[contextType].icon}
      {ChatContextOptions[contextType].label}
    </Button>
  );
}
export default ContextButton;
