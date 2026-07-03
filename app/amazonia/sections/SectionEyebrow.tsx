import { Box, Heading } from "@chakra-ui/react";
import type { ReactNode } from "react";

type SectionEyebrowProps = {
  eyebrow: string;
  heading: ReactNode;
  tone?: "light" | "dark";
  my?: string;
};

const toneStyles = {
  light: {
    barColor: "secondary.300",
    eyebrowColor: "primary.500",
    headingColor: "neutral.900",
  },
  dark: {
    barColor: "lime.400",
    eyebrowColor: "lime.400",
    headingColor: "white",
  },
};

export default function SectionEyebrow({
  eyebrow,
  heading,
  tone = "light",
  my = "52px",
}: SectionEyebrowProps) {
  const { barColor, eyebrowColor, headingColor } = toneStyles[tone];
  return (
    <Box my={my}>
      <Box w="44px" h="3px" bg={barColor} rounded="full" mb="18px" />
      <Box
        fontFamily="mono"
        fontSize="11px"
        letterSpacing="0.18em"
        textTransform="uppercase"
        color={eyebrowColor}
        mb="10px"
      >
        {eyebrow}
      </Box>
      <Heading
        m={0}
        fontSize={{ base: "26px", md: "34px" }}
        lineHeight="1.15"
        fontWeight="600"
        letterSpacing="-0.02em"
        color={headingColor}
      >
        {heading}
      </Heading>
    </Box>
  );
}
