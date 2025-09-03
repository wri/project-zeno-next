import { Box, Flex, FlexProps } from "@chakra-ui/react";
import { WarningIcon } from "@phosphor-icons/react";

import theme from "../theme";

export default function ChatStatusInfo(props: FlexProps) {
  const { children, ...rest } = props;

  return (
    <Flex
      bg="red.100"
      border="solid 1px {colors.red.200}"
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
          color: "blue.600",
          textDecoration: "underline",
        },
        "& svg": {
          mt: "2px",
        },
      }}
      {...rest}
    >
      <WarningIcon
        size="14"
        weight="fill"
        color={theme.token("colors.red.600")}
      />
      <Box>{children}</Box>
    </Flex>
  );
}
