import { Box, CloseButton, type BoxProps } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";

interface ChatDisclaimerProps extends BoxProps {
  setDisplayDisclaimer?: React.Dispatch<React.SetStateAction<boolean>>;
  type?: "info" | "error" | "warning" | "success";
  children: React.ReactNode;
}

const typeColorMap = {
  info: "secondary",
  error: "red",
  warning: "orange",
  success: "green",
};

const TypeIcon = {
  info: InfoIcon,
  error: WarningCircleIcon,
  warning: WarningIcon,
  success: CheckCircleIcon,
};

export default function ChatDisclaimer({
  setDisplayDisclaimer,
  type = "info",
  children,
  ...boxProps
}: ChatDisclaimerProps) {
  const IconComponent = TypeIcon[type];

  return (
    <Box
      background={`${typeColorMap[type]}.subtle`}
      p={2}
      rounded="sm"
      border="1px solid"
      borderColor={`${typeColorMap[type]}.muted`}
      fontSize="xs"
      display="flex"
      gap={2}
      my={4}
      mb={6}
      {...boxProps}
    >
      <IconComponent
        weight="fill"
        style={{ flexShrink: 0 }}
        size="16"
        fill={`var(--chakra-colors-${typeColorMap[type]}-600)`}
      />
      <Box>{children}</Box>
      {setDisplayDisclaimer && (
        <CloseButton
          size="2xs"
          variant="ghost"
          colorPalette={typeColorMap[type]}
          title="Hide disclaimer"
          onClick={() => setDisplayDisclaimer((prev) => !prev)}
        />
      )}
    </Box>
  );
}
