import { Box, Text } from "@chakra-ui/react";

import { lgmsClassDescription } from "@/src/shared/lib/lgms-descriptions";

import { InfoTitle, InfoTooltip } from "./InfoTooltip";

/**
 * The per-class info icon both LGMS charts hang beside a class name — a row of
 * the annual-average tree, a legend entry of the time series — opening what
 * that class measures (`lgms-descriptions`). Renders nothing when there is no
 * class or no description for it, so callers need no guard and a class the
 * backend adds later just loses its icon.
 */
export function LgmsClassInfo({
  classId,
  label,
  size,
}: {
  /** The backend's raw class id: a tree node id or a series field's class. */
  classId?: string;
  /** The class as the caller prints it, so heading and icon name match the text. */
  label: string;
  /** Glyph size, passed through to `InfoTooltip`; each chart sizes it to its type. */
  size?: number;
}) {
  const description = classId ? lgmsClassDescription(classId) : null;
  if (!description) return null;

  return (
    <InfoTooltip about={label} size={size}>
      <Box maxW="280px">
        <InfoTitle>{label}</InfoTitle>
        <Text>{description}</Text>
      </Box>
    </InfoTooltip>
  );
}
