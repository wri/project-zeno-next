"use client";

import { Box, Text } from "@chakra-ui/react";
import { ATTRIBUTION_ORDER } from "../../model/config";
import { SERIF_STACK } from "../charts/palette";
import { DIMENSION_COPY, STORY } from "./copy";
import { Panel, Segments } from "./Section";

/** The narrative interlude: one prompt walked through the five checks. */
export function WorkedExample() {
  return (
    <Box maxW="46rem">
      <Text
        fontFamily={SERIF_STACK}
        fontSize={{ base: "md", md: "lg" }}
        lineHeight="1.66"
        color="fg.muted"
      >
        <Segments segments={STORY.lead} />
      </Text>

      <Panel p={{ base: 5, md: 7 }} mt={5}>
        <Text
          fontFamily="mono"
          fontSize="2xs"
          fontWeight="semibold"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="fg.subtle"
        >
          {STORY.exampleLabel}
        </Text>
        <Text
          fontFamily={SERIF_STACK}
          fontStyle="italic"
          fontSize={{ base: "lg", md: "xl" }}
          lineHeight="1.4"
          mt={2}
          mb={5}
        >
          &ldquo;{STORY.exampleQuestion}&rdquo;
        </Text>
        <Box as="ol" listStyleType="none" m={0} p={0}>
          {ATTRIBUTION_ORDER.map((bucket, index) => {
            const last = index === ATTRIBUTION_ORDER.length - 1;
            return (
              <Box
                as="li"
                key={bucket}
                position="relative"
                ml="13px"
                pl="26px"
                pb={last ? 0.5 : 4}
                borderLeftWidth="1px"
                borderColor={last ? "transparent" : "border"}
                fontSize="sm"
                color="fg.muted"
              >
                <Box
                  position="absolute"
                  left="-13px"
                  top="-2px"
                  boxSize="25px"
                  borderRadius="full"
                  borderWidth="1.5px"
                  borderColor="primary.solid"
                  bg="bg"
                  color="primary.fg"
                  fontFamily="mono"
                  fontSize="xs"
                  fontWeight="semibold"
                  display="grid"
                  placeItems="center"
                  aria-hidden
                >
                  {index + 1}
                </Box>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  letterSpacing="0.09em"
                  textTransform="uppercase"
                  color="primary.fg"
                  mb={0.5}
                >
                  {DIMENSION_COPY[bucket].label}
                </Text>
                {DIMENSION_COPY[bucket].example}
              </Box>
            );
          })}
        </Box>
      </Panel>

      <Box
        as="blockquote"
        position="relative"
        mt={7}
        pt={3.5}
        fontFamily={SERIF_STACK}
        fontStyle="italic"
        fontWeight="500"
        fontSize={{ base: "xl", md: "2xl" }}
        lineHeight="1.42"
        maxW="32em"
        _before={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          w: "52px",
          borderTopWidth: "3px",
          borderColor: "primary.solid",
        }}
      >
        {STORY.pull}
      </Box>
    </Box>
  );
}
