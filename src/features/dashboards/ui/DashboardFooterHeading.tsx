import { Box, Flex, Heading } from "@chakra-ui/react";

/**
 * A footer block's heading (Figma node 3938:11841): an italic title, then a
 * rule to the row's end.
 */
export default function DashboardFooterHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Flex align="center" gap="20px">
      <Heading
        as="h2"
        flexShrink={0}
        fontSize="20px"
        lineHeight="1.25"
        fontStyle="italic"
        fontWeight="normal"
        color="#565E7B"
        // The theme's globalCss gives every h2 a 16px margin-bottom.
        mb="0"
      >
        {children}
      </Heading>
      <Box flex={1} h="1px" bg="#E0E2E5" />
    </Flex>
  );
}
