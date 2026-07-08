import { Box, Text } from "@chakra-ui/react";

export default function Lead() {
  return (
    <Box as="section" borderBottom="1px solid" borderColor="neutral.300">
      <Box maxW="900px" mx="auto" px={{ base: 6, md: 8 }} pt="72px" pb="64px">
        <Text
          m={0}
          fontSize={{ base: "22px", md: "clamp(22px, 2.6vw, 29px)" }}
          lineHeight="1.45"
          fontWeight="400"
          color="neutral.900"
          letterSpacing="-0.01em"
        >
          This multi-partner initiative brings together a growing coalition of
          Amazonian research institutions, conservation organizations, national
          environmental institutes, leading universities and tech companies and
          global data and technology platforms.
        </Text>
      </Box>
    </Box>
  );
}
