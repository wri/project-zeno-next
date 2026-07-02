"use client";
import { Box, Flex, Text } from "@chakra-ui/react";
import { SparkleIcon } from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";

const AI_DISCLAIMER =
  "This visualization includes AI-generated charts and data summaries. AI models may produce incomplete or incorrect information. Please verify all outputs before using them in your work.";

const aiDisclaimerTooltip = (
  <Box display="flex" flexDirection="column" gap="2px" maxW="296px">
    <Text
      fontFamily="body"
      fontSize="12px"
      lineHeight="150%"
      fontWeight="medium"
      color="#FFFFFF"
    >
      AI-ASSISTED
    </Text>
    <Text
      fontFamily="body"
      fontSize="12px"
      lineHeight="150%"
      fontWeight="normal"
      color="#B2B6BD"
    >
      {AI_DISCLAIMER}
    </Text>
  </Box>
);

/**
 * Caption shown at the top of an insight card in the workspace.
 * curated → "CURATED" (direct-API flow, no AI disclaimer)
 * default → "AI-ASSISTED · Learn more" with disclaimer tooltip
 */
export default function InsightCaption({ curated }: { curated?: boolean }) {
  return (
    <Flex align="center" gap="4px" h="16px">
      <SparkleIcon size={12} weight="thin" color="#737C94" />
      <Text
        fontSize="10px"
        fontFamily="mono"
        fontWeight="normal"
        lineHeight="16px"
        letterSpacing="0.03em"
        color="#737C94"
        whiteSpace="nowrap"
      >
        {curated ? (
          "CURATED"
        ) : (
          <>
            AI-ASSISTED
            {" · "}
            <Tooltip
              variant="dark"
              content={aiDisclaimerTooltip}
              showArrow
              positioning={{ placement: "bottom" }}
              openDelay={100}
              closeDelay={100}
            >
              <Box
                as="span"
                color="#4A64CB"
                textDecoration="underline"
                cursor="help"
                tabIndex={0}
                aria-label="Learn more about AI-assisted analysis"
              >
                Learn more
              </Box>
            </Tooltip>
          </>
        )}
      </Text>
    </Flex>
  );
}
