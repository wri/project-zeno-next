import { Box, Flex, Text } from "@chakra-ui/react";
import { VERIFICATION_EYEBROW } from "@/src/shared/ui/entity-card";
import { Tooltip } from "./ui/tooltip";

const AI_DISCLAIMER =
  "This visualization includes AI-generated charts and data summaries. AI models may produce incomplete or incorrect information. Please verify all outputs before using them in your work.";

// A curated chart can sit beside text the model wrote (in chat), so the note
// vouches for the charts and figures only, never the whole answer.
function sourceDataNote(datasetName?: string) {
  return `The charts and figures come straight from ${datasetName ?? "the source data"} through a direct data query. No AI model made them.`;
}

function CaptionTooltip({ heading, body }: { heading: string; body: string }) {
  return (
    <Box display="flex" flexDirection="column" gap="2px" maxW="296px">
      <Text
        fontFamily="body"
        fontSize="12px"
        lineHeight="150%"
        fontWeight="medium"
        color="#FFFFFF"
      >
        {heading}
      </Text>
      <Text
        fontFamily="body"
        fontSize="12px"
        lineHeight="150%"
        fontWeight="normal"
        color="#B2B6BD"
      >
        {body}
      </Text>
    </Box>
  );
}

/**
 * Caption that says where an insight came from, on chat cards, the map
 * workspace, the Analyses pane and dashboards. Both variants carry a
 * "Learn more" tooltip; `showLearnMore={false}` drops it for compact badges.
 * It is hidden in print by the caption itself, where nothing can be hovered.
 * curated → green check circle + "SOURCE: <dataset>" (direct data query), or
 *   "SOURCE DATA" when the surface does not know the dataset. Never guess
 *   one: a wrong name is worse than none.
 * default → gray sparkle + "AI-ASSISTED" (AI-generated, carries a disclaimer)
 */
export default function InsightCaption({
  curated,
  datasetName,
  showLearnMore = true,
}: {
  curated?: boolean;
  /** The main dataset of a curated insight, as the surface recorded it. */
  datasetName?: string;
  showLearnMore?: boolean;
}) {
  const spec = VERIFICATION_EYEBROW[curated ? "verified" : "ai-generated"];
  const BadgeIcon = spec.Icon;
  return (
    <Flex align="center" gap="4px" h="16px">
      {BadgeIcon && (
        <BadgeIcon size={12} weight={spec.iconWeight} color={spec.iconColor} />
      )}
      <Text
        fontSize="10px"
        fontFamily="mono"
        fontWeight="normal"
        lineHeight="16px"
        letterSpacing="0.03em"
        color={spec.color}
        whiteSpace="nowrap"
      >
        {!curated ? (
          "AI-ASSISTED"
        ) : datasetName ? (
          <>
            {"SOURCE: "}
            <Box
              as="span"
              display="inline-block"
              maxW="28ch"
              overflow="hidden"
              textOverflow="ellipsis"
              verticalAlign="bottom"
              letterSpacing="0.01em"
              color="#3A4048"
              title={datasetName}
            >
              {datasetName}
            </Box>
          </>
        ) : (
          "SOURCE DATA"
        )}
        {showLearnMore && (
          // Paper cannot hover, so the whole "Learn more" part is hidden in print.
          <Box as="span" _print={{ display: "none" }}>
            {" · "}
            <Tooltip
              variant="dark"
              content={
                curated ? (
                  <CaptionTooltip
                    heading="SOURCE DATA"
                    body={sourceDataNote(datasetName)}
                  />
                ) : (
                  <CaptionTooltip heading="AI-ASSISTED" body={AI_DISCLAIMER} />
                )
              }
              showArrow
              positioning={{ placement: "bottom" }}
              openDelay={100}
              closeDelay={100}
            >
              <Box
                as="span"
                color="#0049AA"
                textDecoration="underline"
                cursor="help"
                tabIndex={0}
                aria-label={
                  curated
                    ? "Learn more about source data"
                    : "Learn more about AI-assisted analysis"
                }
              >
                Learn more
              </Box>
            </Tooltip>
          </Box>
        )}
      </Text>
    </Flex>
  );
}
