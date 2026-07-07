import { Box, Container, Heading, Text } from "@chakra-ui/react";
import GlobalHeader from "@/app/components/GlobalHeader";
import { PAGE_MAX_W, CONTENT_MAX_W } from "./widths";

const highlight = { as: "span" as const, color: "lime.400" };

export default function Hero() {
  return (
    <Box
      as="section"
      position="relative"
      color="white"
      backgroundColor="#0B1A14"
      backgroundImage="linear-gradient(180deg, rgba(12,36,26,.32) 0%, rgba(16,44,32,.55) 45%, rgba(6,22,16,.9) 100%), url('/amazonia-hero.avif')"
      backgroundSize="cover"
      backgroundPosition="center"
      backgroundRepeat="no-repeat"
    >
      <Box position="relative" zIndex={3}>
        <GlobalHeader showSectionLinks={false} />
      </Box>

      <Container
        position="relative"
        zIndex={2}
        maxW={PAGE_MAX_W}
        px={{ base: 6, md: 8 }}
        pt={{ base: 16, md: "88px" }}
        pb={{ base: 16, md: "84px" }}
      >
        <Box maxW={CONTENT_MAX_W}>
          <Heading
            m={0}
            color="white"
            fontSize={{ base: "42px", md: "clamp(42px, 6.2vw, 72px)" }}
            lineHeight="1.04"
            fontWeight="600"
            letterSpacing="-0.025em"
          >
            Amazon
            <Text {...highlight}>.ia</Text>
            <br />
            <Text {...highlight}>I</Text>
            nteligência <Text {...highlight}>A</Text>
            mbiental
          </Heading>
          <Text
            m={0}
            mt="26px"
            maxW="660px"
            fontSize="18px"
            lineHeight="1.66"
            color="whiteAlpha.800"
          >
            Amazon.ia is a groundbreaking initiative that aims to revolutionize
            biodiversity monitoring to strengthen conservation decision-making
            across the Amazon. Harnessing recent breakthroughs in AI, Amazon.ia
            will fuse satellite and ground sensor data to deliver actionable
            biodiversity intelligence at every scale — from individual
            conservation sites to the entire biome.
          </Text>
        </Box>
      </Container>

      <Text
        position="absolute"
        zIndex={3}
        right={{ base: 4, md: 8 }}
        bottom="22px"
        m={0}
        fontFamily="mono"
        fontSize="12px"
        letterSpacing="0.02em"
        color="whiteAlpha.500"
      >
        Last updated July 2026
      </Text>
    </Box>
  );
}
