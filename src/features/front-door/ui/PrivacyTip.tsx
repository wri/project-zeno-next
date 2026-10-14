"use client";

import { useId, useState } from "react";
import { Box, IconButton } from "@chakra-ui/react";
import { QuestionIcon } from "@phosphor-icons/react";
import { GNW_AI_PRIVACY_POLICY, WRI_PRIVACY_POLICY } from "../model/terms";
import { TermsAnchor } from "./TermsConsentLabel";

/**
 * "How we use your data": a "?" next to the card's title that toggles a
 * line linking the privacy policies. A click toggle rather than a hover
 * tooltip, so it works on touch and its links can be reached.
 */
export function usePrivacyTip() {
  const [open, setOpen] = useState(false);
  const id = useId();

  const button = (
    <IconButton
      size="2xs"
      variant={open ? "solid" : "ghost"}
      rounded="full"
      aria-label="How we use your data"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
    >
      <QuestionIcon />
    </IconButton>
  );

  const tip = open ? (
    <Box
      id={id}
      bg="bg.inverted"
      color="fg.inverted"
      fontSize="xs"
      rounded="md"
      px={2.5}
      py={2}
    >
      How we store and use your data:{" "}
      <TermsAnchor link={WRI_PRIVACY_POLICY} color="fg.inverted" /> ·{" "}
      <TermsAnchor link={GNW_AI_PRIVACY_POLICY} color="fg.inverted" />
    </Box>
  ) : null;

  return { button, tip };
}
