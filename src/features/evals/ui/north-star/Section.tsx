"use client";

import type { ReactNode } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { SERIF_STACK } from "../charts/palette";
import type { Segment } from "./copy";

/** Mono uppercase kicker above a heading. */
export function Eyebrow({ children }: { readonly children: ReactNode }) {
  return (
    <Text
      as="span"
      display="block"
      fontFamily="mono"
      fontSize="2xs"
      fontWeight="medium"
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="primary.fg"
    >
      {children}
    </Text>
  );
}

/** One scene of the narrative: eyebrow, serif title, one-line sub. */
export function Section({
  id,
  eyebrow,
  title,
  sub,
  children,
}: {
  readonly id: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly sub?: string;
  readonly children: ReactNode;
}) {
  return (
    <Box
      as="section"
      id={id}
      aria-labelledby={title ? `${id}-title` : undefined}
      py={{ base: 8, md: 12 }}
      borderTopWidth="1px"
      borderColor="border"
      _first={{ borderTopWidth: 0, pt: { base: 2, md: 4 } }}
    >
      {eyebrow || title ? (
        <Box mb={5}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? (
            <Heading
              id={`${id}-title`}
              as="h2"
              fontFamily={SERIF_STACK}
              fontWeight="600"
              fontSize={{ base: "xl", md: "2xl" }}
              mt={1}
            >
              {title}
            </Heading>
          ) : null}
          {sub ? (
            <Text color="fg.muted" fontSize="sm" mt={1} maxW="70ch">
              {sub}
            </Text>
          ) : null}
        </Box>
      ) : null}
      {children}
    </Box>
  );
}

/** Render copy segments, bolding the strong ones. */
export function Segments({
  segments,
}: {
  readonly segments: readonly Segment[];
}) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.strong ? (
          <Text as="strong" key={index} fontWeight="semibold" color="fg">
            {segment.text}
          </Text>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

/** Card frame shared by the scenes (matches ChartCard's chrome). */
export function Panel({
  children,
  ...rest
}: { readonly children: ReactNode } & React.ComponentProps<typeof Box>) {
  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      minW={0}
      {...rest}
    >
      {children}
    </Box>
  );
}
