import { Box, Flex, FlexProps } from "@chakra-ui/react";
import {
  WarningIcon,
  InfoIcon,
  WarningCircleIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";

import theme from "../theme";

interface ChatStatusInfoProps extends FlexProps {
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

export default function ChatStatusInfo(props: ChatStatusInfoProps) {
  const { type = "error", children, ...rest } = props;
  const IconComponent = TypeIcon[type];
  return (
    <Flex
      background={`${typeColorMap[type]}.subtle`}
      border="solid 1px"
      borderColor={`${typeColorMap[type]}.muted`}
      borderBottom="none"
      borderTopRightRadius="md"
      borderTopLeftRadius="md"
      mx={4}
      py={4}
      px={2}
      gap={2}
      fontSize="xs"
      css={{
        "& a": {
          color: "primary.solid",
          textDecoration: "underline",
        },
        "& svg": {
          mt: "2px",
        },
      }}
      {...rest}
    >
      <IconComponent
        weight="fill"
        style={{ flexShrink: 0 }}
        size="16"
        fill={`var(--chakra-colors-${typeColorMap[type]}-600)`}
      />
      <Box>{children}</Box>
    </Flex>
  );
}
