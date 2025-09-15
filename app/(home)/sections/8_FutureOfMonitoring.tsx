import NextImage from "next/image";
import {
  Box,
  Container,
  Heading,
  Flex,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";

export default function FutureOfMonitoringSection() {
  return (
    <Box
      py={{ base: 14, md: 24 }}
      pb={{ base: 14, md: 28 }}
      borderBlockEnd="1px solid"
      borderColor="border"
    >
      <Container
        css={{ "& > *": { px: 0 } }}
        display="flex"
        flexDir="column"
        gap={{ base: "8", md: "14" }}
      >
        <Container textAlign="center" maxW="2xl">
          <Heading size={{ base: "3xl", md: "4xl" }}>
            About Global Nature Watch
          </Heading>
          <Text fontSize="lg" mb="4">
          We&apos;re making environmental geospatial data faster,
          more accessible and easier to use for everyone working to protect and restore nature.
          </Text>
          </Container>
          <Container display="flex" maxW="5xl">
          <Text fontSize="lg" mb="4">
          For more than a decade, World Resources Institute tools like Global Forest Watch have
          transformed how the world monitors nature, driving impact across the tropics and beyond.
          Global Nature Watch marks the next chapter. Built on trusted, peer-reviewed data and
          powered by the latest advances in AI, it shifts monitoring from fixed global outputs to
          targeted, actionable insights delivered in the language, regions and contexts that matter most.
          </Text>
        </Container>
        <Container display="flex" gap="14" flexDir={"column"} maxW="5xl">
          <Flex
            flexDir={{ base: "column-reverse", md: "row" }}
            alignItems="center"
            gap={{ base: "10", md: "16" }}
          >
            <Box maxW="lg">
              <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                Cutting-edge data
              </Heading>
              <Text fontSize="lg" mb="4">
                We tackle the hardest challenges in monitoring nature,
                providing globally consistent data built by some of the world&rsquo;s
                most talented experts.
                Our data is designed to empower real-world action, today and into the future.
              </Text>
            </Box>
            <Box position="relative" h="72" w="full">
              {/* Images in the "Cuting edge data" section will animate in from container sides */}
              <Box position="absolute" h="121px" w="201px" top="0.5" rounded="md" overflow="hidden">
                <NextImage
                  src="/fm-1a.webp"
                  alt="image of a field"
                  fill
                  style={{ objectFit: "cover" }}
                />
              </Box>
              <Box position="absolute" h="127px" w="178px" top="25%" right="0" rounded="md" overflow="hidden">
                <NextImage
                  src="/fm-1b.webp"
                  alt="image of a field"
                  fill
                  style={{ objectFit: "cover" }}
                />
              </Box>
              <Box position="absolute" h="124px" w="172px" bottom="5%" left="15%" rounded="md" overflow="hidden">
                <NextImage
                  src="/fm-1c.webp"
                  alt="image of a field"
                  fill
                  style={{ objectFit: "cover" }}
                />
              </Box>
            </Box>
          </Flex>
          <Flex
            flexDir={{ base: "column-reverse", md: "row" }}
            alignItems="center"
            gap={{ base: "10", md: "16" }}
          >
            <Box maxW="lg">
              <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                Monitoring intelligence
              </Heading>
              <Text fontSize="lg" mb="4">
                With so much geospatial data available, it can be hard to know where to start.
                Global Nature Watch places the power of a personal geospatial assistant in your pocket.
                AI trained on trusted datasets helps both experts and newcomers navigate,
                analyze and apply insights.
              </Text>
            </Box>
            <Box position="relative" h="72" w="full">
              {/* Chat window items slide in from sides */}
              <Box
                fontSize="10px"
                padding="6px"
                bg="secondary.300"
                rounded="sm"
                shadow="sm"
                position="absolute"
                maxW="172px"
                top="20%"
                zIndex="10"
              >
                Identify disturbances in my project portfolio
              </Box>
              <Box
                fontSize="10px"
                padding="6px"
                bg="secondary.300"
                rounded="sm"
                shadow="sm"
                position="absolute"
                maxW="172px"
                right="0"
                top="50%"
                zIndex="10"
              >
                Show me high priority areas for agroforesty projects
              </Box>
              <Box
                width="136px"
                h="280px"
                position="relative"
                left="50%"
                transform="translateX(-50%)"
              >
                <NextImage
                  src="/fm-2.webp"
                  alt="Smartphone mockup of monitoring application"
                  fill
                  style={{ objectFit: "cover", objectPosition: "80%" }}
                />
              </Box>
            </Box>
          </Flex>
          <Flex
            flexDir={{ base: "column-reverse", md: "row" }}
            alignItems="center"
            gap={{ base: "10", md: "16" }}
          >
            <Box maxW="lg">
              <Heading size={{ base: "xl", md: "2xl" }} mb="2">
                Interoperable technology (coming soon)
              </Heading>
              <Text fontSize="lg" mb="4">
               We believe the future of monitoring is open, extensible and integrative.
                That&apos;s why Global Nature Watch will be able to connect with your
                own systems, extending the power of your data.
              </Text>
            </Box>
            <Box
              position="relative"
              display="grid"
              placeContent="center"
              w="full"
              h={{base: "14rem", md: "17rem"}}
            >
              <NextImage
                style={{
                  objectPosition: "80%",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
                src="/integrations.svg"
                alt="Global Nature Watch integrations"
                fill
              />
            </Box>
          </Flex>
        </Container>
      </Container>
    </Box>
  );
}
