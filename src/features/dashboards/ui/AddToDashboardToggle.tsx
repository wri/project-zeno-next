"use client";

import { useState } from "react";
import { Button } from "@chakra-ui/react";
import { CheckIcon, SquaresFourIcon } from "@phosphor-icons/react";

import RemoveAnalysisDialog from "./RemoveAnalysisDialog";
import { useAddInsightToDashboard } from "./useAddInsightToDashboard";

/**
 * Chat-side "Add to dashboard" toggle. The target dashboard, ownership check,
 * toggle state and add/remove behaviour all come from
 * `useAddInsightToDashboard`; this component only renders the button, and only
 * when the analysis is actually addable (a dashboard the viewer owns).
 *
 * Removal confirms first when the dashboard module carries hand-arranged
 * config, which the delete would discard — see `RemoveAnalysisDialog`.
 */
export default function AddToDashboardToggle({
  insightId,
}: {
  insightId: string;
}) {
  const { addable, added, removeNeedsConfirm, pending, toggle } =
    useAddInsightToDashboard(insightId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!addable) return null;

  return (
    <>
      <Button
        size="xs"
        variant={added ? "solid" : "outline"}
        colorPalette={added ? "primary" : undefined}
        onClick={() => (removeNeedsConfirm ? setConfirmOpen(true) : toggle())}
        h={6}
        rounded="sm"
        color={added ? undefined : "neutral.500"}
        loading={pending}
        aria-pressed={added}
        title={
          added
            ? "Remove this analysis from the dashboard"
            : "Add this analysis to the dashboard"
        }
      >
        {added ? <CheckIcon size={12} /> : <SquaresFourIcon size={12} />}
        {added ? "On dashboard" : "Add to dashboard"}
      </Button>
      <RemoveAnalysisDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        customized
        onConfirm={toggle}
      />
    </>
  );
}
