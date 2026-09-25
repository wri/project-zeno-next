"use client";

/**
 * What we measure, and why: the five dimensions behind the North Star
 * number, each with what we check, why a failure misleads, and what is
 * not covered yet (copy from the North Star v2 wireframe).
 */

import { Box, Grid, Heading, Link, Text } from "@chakra-ui/react";
import { SERIF_STACK } from "./charts/palette";
import { DIMENSION_COPY, METHODOLOGY } from "./north-star/copy";
import { Eyebrow } from "./north-star/Section";

const LABEL_PROPS = {
  fontFamily: "mono",
  fontSize: "2xs",
  fontWeight: "semibold",
  letterSpacing: "0.11em",
  textTransform: "uppercase",
  color: "primary.fg",
} as const;

export function MethodologyTab({ onBack }: { readonly onBack: () => void }) {
  return (
    <Box maxW="72rem">
      <Box maxW="45rem" pt={{ base: 2, md: 6 }} pb={2}>
        <Eyebrow>{METHODOLOGY.eyebrow}</Eyebrow>
        <Heading
          as="h1"
          fontFamily={SERIF_STACK}
          fontWeight="600"
          fontSize={{ base: "2xl", md: "4xl" }}
          mt={1.5}
          mb={3.5}
        >
          {METHODOLOGY.title}
        </Heading>
        <Text
          fontFamily={SERIF_STACK}
          fontSize={{ base: "md", md: "lg" }}
          lineHeight="1.66"
          color="fg.muted"
        >
          {METHODOLOGY.lead}
        </Text>
        <Link as="button" color="primary.fg" mt={3} onClick={onBack}>
          ← Back to the overview
        </Link>
      </Box>

      {METHODOLOGY.dimensions.map((dimension, index) => (
        <Grid
          key={dimension.bucket}
          templateColumns={{ base: "1fr", md: "minmax(180px, 240px) 1fr" }}
          gap={{ base: 3, md: 10 }}
          borderTopWidth="1px"
          borderColor="border"
          py={6}
          mt={index === 0 ? 4 : 0}
        >
          <Box>
            <Heading
              as="h3"
              fontFamily={SERIF_STACK}
              fontWeight="600"
              fontSize="xl"
            >
              {index + 1} · {DIMENSION_COPY[dimension.bucket].label}
            </Heading>
            <Text
              fontFamily={SERIF_STACK}
              fontStyle="italic"
              fontSize="sm"
              color="fg.subtle"
              mt={1.5}
            >
              {DIMENSION_COPY[dimension.bucket].question}
            </Text>
          </Box>
          <Box as="dl" m={0}>
            {(["measure", "misleads", "gaps"] as const).map((key, i) => (
              <Box key={key} mt={i === 0 ? 0 : 3.5}>
                <Text as="dt" {...LABEL_PROPS} mb={0.5}>
                  {METHODOLOGY.labels[key]}
                </Text>
                <Text as="dd" m={0} fontSize="sm" color="fg.muted" maxW="62ch">
                  {dimension[key]}
                </Text>
              </Box>
            ))}
          </Box>
        </Grid>
      ))}

      <Box borderTopWidth="1px" borderColor="border" py={6} maxW="45rem">
        <Heading
          as="h3"
          fontFamily={SERIF_STACK}
          fontWeight="600"
          fontSize="xl"
          mb={2.5}
        >
          {METHODOLOGY.gapsTitle}
        </Heading>
        <Text fontFamily={SERIF_STACK} lineHeight="1.66" color="fg.muted">
          {METHODOLOGY.gapsBody}
        </Text>
        <Link as="button" color="primary.fg" mt={3} onClick={onBack}>
          ← Back to the overview
        </Link>
      </Box>
    </Box>
  );
}
