import { Box, Text } from "@chakra-ui/react";

export default function BetaTag() {
  return (
    <Box bg="lime.400" rounded="sm" px="6px" py="1px" flexShrink={0}>
      <Text
        fontFamily="mono"
        fontSize="10px"
        fontWeight="medium"
        letterSpacing="0.4px"
        textTransform="uppercase"
        color="neutral.900"
      >
        Beta
      </Text>
    </Box>
  );
}
