import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import SectionEyebrow from "./SectionEyebrow";
import { PAGE_MAX_W, CONTENT_MAX_W } from "./widths";

const partnerNames = [
  "ALFA",
  "Andes Amazon Fund",
  "Arizona State University (Asner Lab)",
  "Bezos Earth Fund",
  "Conservación Amazónica (ACCA)",
  "Cornell Lab of Ornithology",
  "George Mason University (Luther Lab)",
  "Global Nature Watch",
  "INPA",
  "Instituto de Desenvolvimento Sustentável Mamirauá",
  "Instituto Humboldt",
  "International Barcode of Life (iBOL)",
  "Massachusetts Institute of Technology (Beery Lab)",
  "Microsoft AI for Good Lab",
  "Planet Labs",
  "Smithsonian ForestGEO",
  "Tiputini Biodiversity Station",
  "Universidad San Francisco de Quito (Rivas Lab)",
  "Universitat Politècnica de Catalunya",
  "University of Guelph",
  "Wildlife Conservation Society Bolivia",
  "Wildlife Insights",
  "WildMon",
  "World Resources Institute",
];

export default function Partners() {
  return (
    <Box as="section" bg="primary.900" color="white" mt="72px">
      <Box
        maxW={PAGE_MAX_W}
        mx="auto"
        px={{ base: 6, md: 8 }}
        pt="76px"
        pb="84px"
      >
        <Box maxW={CONTENT_MAX_W}>
          <SectionEyebrow
            eyebrow="The coalition"
            heading="Partners"
            tone="dark"
            my="0"
          />
          <Text
            m={0}
            mt="20px"
            mb="14px"
            fontSize="17px"
            lineHeight="1.7"
            color="whiteAlpha.800"
          >
            Amazon.ia is launching in 2026 with a seed grant from the{" "}
            <Text as="span" color="white" fontWeight="500">
              Bezos Earth Fund
            </Text>
            . It brings together a diverse network spanning Amazonian research
            institutions, conservation organizations, universities, national
            environmental institutes and global data and technology platforms —
            building the locally led infrastructure, scientific capacity,
            decision support and technological innovation needed to generate
            actionable biodiversity intelligence across the Amazon.
          </Text>
        </Box>

        <SimpleGrid
          minChildWidth="240px"
          gap="0 28px"
          mt="40px"
          borderTop="1px solid"
          borderColor="whiteAlpha.300"
          pt="8px"
        >
          {partnerNames.map((name, i) => (
            <Box
              key={name}
              display="flex"
              alignItems="baseline"
              gap="12px"
              py="13px"
              borderBottom="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text
                m={0}
                fontFamily="mono"
                fontSize="11px"
                color="lime.400/70"
                minW="22px"
              >
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text
                m={0}
                fontSize="14.5px"
                lineHeight="1.35"
                color="whiteAlpha.900"
              >
                {name}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
        <Text m={0} mt="26px" fontSize="14px" color="whiteAlpha.700">
          Additional partners will be announced as the initiative expands.
        </Text>
      </Box>
    </Box>
  );
}
