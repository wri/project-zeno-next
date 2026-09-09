"use client";

import { useMemo, useState } from "react";
import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { CaretLeftIcon } from "@phosphor-icons/react";

import { CatalogCard } from "@/app/components/CatalogCard";
import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";
import {
  curatedCatalogue,
  type AnalysisResult,
  type AnalysisService,
  type CuratedAnalysisSpec,
  type CuratedAnalysisState,
} from "@/src/features/analysis";
// Deep imports into dashboards/ui, matching insights-panel.tsx (see the note
// there): the pane reaches the dashboards feature only through its ui hooks.
import RemoveAnalysisDialog from "@/src/features/dashboards/ui/RemoveAnalysisDialog";
import { useAddCuratedAnalysisToDashboard } from "@/src/features/dashboards/ui/useAddCuratedAnalysisToDashboard";
import type { CurrentDashboardArea } from "@/src/features/dashboards/ui/useCurrentDashboardArea";

import { analysisResultToGroup } from "../lib/insight-groups";
import {
  INSIGHT_LABEL_COLOR,
  INSIGHT_SELECTED_BG,
  InsightGroupDetail,
  InsightThumbnail,
  VerificationBadge,
} from "./insight-card-parts";

/** One-line card copy per non-idle state; idle/ready cards show the analysis description. */
const STATE_COPY: Record<
  Exclude<CuratedAnalysisState, "not-run" | "ready">,
  string
> = {
  running: "Running analysis...",
  unavailable: "Not available for this area right now",
  "no-data": "No data for this area",
  error: "Couldn't run this analysis",
};

interface CuratedCardProps {
  spec: CuratedAnalysisSpec;
  area: CurrentDashboardArea;
  service?: AnalysisService;
}

/** The completed analysis as one curated, addable group; null until ready. */
function useCuratedGroup(
  result: AnalysisResult | null,
  spec: CuratedAnalysisSpec,
  area: CurrentDashboardArea
) {
  const { datasetName } = spec;
  const areaName = area.name;
  return useMemo(
    () =>
      result ? analysisResultToGroup(result, { datasetName, areaName }) : null,
    [result, datasetName, areaName]
  );
}

/**
 * The dashboard surface's Curated tab: one card per curated analysis in the
 * catalogue, pre-scoped to the dashboard's AOI. Nothing runs until a card is
 * opened or toggled; the run, its session cache and the add all live in
 * `useAddCuratedAnalysisToDashboard`, shared with the dashboard's suggested
 * module tiles. `service` is injectable for tests.
 */
export function CuratedInsightsList({
  area,
  service,
}: {
  area: CurrentDashboardArea;
  service?: AnalysisService;
}) {
  // Resolved lazily so a catalogue/registry drift throws at render, not at
  // module load, where it would take every importer down with it.
  const specs = useMemo(() => curatedCatalogue(), []);
  const [openDatasetId, setOpenDatasetId] = useState<number | null>(null);
  const open = specs.find((s) => s.datasetId === openDatasetId);

  if (open) {
    return (
      <CuratedInsightDetail
        spec={open}
        area={area}
        service={service}
        onBack={() => setOpenDatasetId(null)}
      />
    );
  }

  return (
    <>
      {specs.map((spec) => (
        <CuratedInsightCard
          key={spec.datasetId}
          spec={spec}
          area={area}
          service={service}
          onOpen={() => setOpenDatasetId(spec.datasetId)}
        />
      ))}
    </>
  );
}

function CuratedInsightCard({
  spec,
  area,
  service,
  onOpen,
}: CuratedCardProps & { onOpen: () => void }) {
  const curated = useAddCuratedAnalysisToDashboard(spec, area, service);
  const group = useCuratedGroup(curated.result, spec, area);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { title, state, added, canAdd, busy, addLocked } = curated;
  // "Adding" is the pending module the dashboard grid shows for this card.
  const adding = curated.pending;
  const description =
    state === "not-run" || state === "ready"
      ? spec.description
      : STATE_COPY[state];
  const showRetry = !busy && (state === "unavailable" || state === "error");

  const handleToggle = () => {
    if (added) {
      // Removing discards the module's arrangement, so confirm first when
      // there is any — identical to the other tabs' cards.
      if (curated.removeNeedsConfirm) setConfirmOpen(true);
      else curated.remove();
      return;
    }
    if (adding) {
      // Toggle off while pending: drop the loading module and do not add. The
      // run itself carries on (nothing to cancel server-side) and its result
      // stays cached for "View analysis".
      curated.cancel();
      return;
    }
    void curated.addNow();
  };

  const handleOpen = () => {
    if (state === "not-run") void curated.start();
    onOpen();
  };

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <CatalogCard
        thumbnail={<InsightThumbnail type={group?.widgets[0]?.type ?? "bar"} />}
        typeLabel="ANALYSIS"
        typeLabelColor={INSIGHT_LABEL_COLOR}
        title={title}
        description={description}
        selected={added || adding}
        selectedBg={INSIGHT_SELECTED_BG}
        // On while added, and while on its way (so the switch mirrors the
        // pending module on the grid and can be flipped back off).
        showOnMap={added || adding}
        onShowOnMapChange={handleToggle}
        toggleLabel={
          added ? "On dashboard" : busy ? "Running..." : "Add to dashboard"
        }
        toggleAriaLabel={
          added
            ? `Remove ${title} from dashboard`
            : adding
              ? `Cancel adding ${title} to dashboard`
              : `Add ${title} to dashboard`
        }
        // The add itself (POST + refetch) cannot be cancelled, so the switch
        // locks for that short window; a run in progress can still be joined
        // (toggle on) or abandoned (toggle off).
        toggleDisabled={!canAdd || addLocked || state === "no-data"}
        onInfoClick={handleOpen}
        infoTooltip="View analysis"
        badge={<VerificationBadge verification="verified" />}
        titleActions={
          showRetry ? (
            <Button
              size="2xs"
              variant="ghost"
              fontSize="10px"
              px={1}
              color="fg.link"
              aria-label={`Try ${title} again`}
              onClick={() => void curated.retry()}
            >
              Try again
            </Button>
          ) : undefined
        }
      />
      <RemoveAnalysisDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        customized
        onConfirm={curated.remove}
      />
    </Box>
  );
}

/**
 * Detail view for one curated card. Pages through the charts once the run is
 * ready; otherwise shows the run's state with a way back (and, when it makes
 * sense, a way to try again). Never mounts the chart pager without charts.
 * Observes the same run as the card (same selection, same cache); it never
 * adds anything itself.
 */
function CuratedInsightDetail({
  spec,
  area,
  service,
  onBack,
}: CuratedCardProps & { onBack: () => void }) {
  const curated = useAddCuratedAnalysisToDashboard(spec, area, service);
  const group = useCuratedGroup(curated.result, spec, area);
  const { title, state } = curated;

  if (state === "ready" && group && group.widgets.length > 0) {
    return <InsightGroupDetail group={group} onBack={onBack} />;
  }

  const message =
    state === "not-run" || state === "ready"
      ? STATE_COPY.running
      : STATE_COPY[state];
  // A failed job is worth retrying (the backend gives up quickly on a cold
  // upstream); "no data" is a real answer, so its retry is deliberately quiet.
  const retryVariant =
    state === "unavailable" || state === "error"
      ? "outline"
      : state === "no-data"
        ? "ghost"
        : null;

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <Button
        variant="ghost"
        size="xs"
        px={1}
        mb={2}
        color="#656E7B"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} />
        Back to analyses
      </Button>
      <Stack gap={2} px={1}>
        <Text fontSize="sm" fontWeight="semibold" color="#3A4048">
          {title}
        </Text>
        <Text fontSize="sm" color="fg.muted" aria-live="polite">
          {message}
        </Text>
        {retryVariant && (
          <Button
            alignSelf="flex-start"
            size="xs"
            variant={retryVariant}
            onClick={() => void curated.retry()}
          >
            Try again
          </Button>
        )}
      </Stack>
    </Box>
  );
}
