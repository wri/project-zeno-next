import { Button, ButtonProps } from "@chakra-ui/react";
import {
  CalendarBlankIcon,
  PolygonIcon,
  StackSimpleIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

/** Context types — stable keys used throughout the app. */
export type ChatContextType = "layer" | "area" | "date";

/** Icons for each context type (not translatable). */
export const ChatContextIcons: Record<ChatContextType, React.ReactElement> = {
  layer: <StackSimpleIcon />,
  area: <PolygonIcon />,
  date: <CalendarBlankIcon />,
};

/**
 * Hook returning icons + translated labels for each context type.
 * Replaces the old static `ChatContextOptions` const.
 */
export function useChatContextOptions() {
  const t = useTranslations("chat");
  return {
    layer: { icon: ChatContextIcons.layer, label: t("context.layer") },
    area: { icon: ChatContextIcons.area, label: t("context.area") },
    date: { icon: ChatContextIcons.date, label: t("context.date") },
  };
}

interface ContextButtonProps extends ButtonProps {
  contextType?: ChatContextType;
}

function ContextButton({ contextType = "area", ...props }: ContextButtonProps) {
  const options = useChatContextOptions();
  return (
    <Button
      size="xs"
      variant="outline"
      borderRadius="full"
      borderColor="gray.300"
      py="1"
      h="auto"
      {...props}
    >
      {options[contextType].icon}
      {options[contextType].label}
    </Button>
  );
}
export default ContextButton;
