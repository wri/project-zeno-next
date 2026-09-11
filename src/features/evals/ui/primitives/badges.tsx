"use client";

import { Badge } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { isCanonicalChallenge, isOfficialGold } from "../../lib/comparability";
import type { RunHeader, Verdict } from "../../model/types";

/**
 * Canonical/diagnostic badge for a run. CHALLENGE doctrine: only prod,
 * default profile, 3 trials publishes rates — everything else is
 * directional. GOLD: 3 trials is the official tier, 1 trial is smoke.
 */
export function RunTierBadge({ run }: { readonly run: RunHeader }) {
  if (run.caseset === "challenge") {
    return isCanonicalChallenge(run) ? (
      <Badge colorPalette="green" variant="subtle">
        Canonical (prod · default · {run.numTrials} trials)
      </Badge>
    ) : (
      <Badge colorPalette="orange" variant="solid">
        Diagnostic · {run.numTrials} {run.numTrials === 1 ? "trial" : "trials"}{" "}
        · not canonical
      </Badge>
    );
  }
  return isOfficialGold(run) ? (
    <Badge colorPalette="green" variant="subtle">
      Official ({run.numTrials} trials)
    </Badge>
  ) : (
    <Badge colorPalette="gray" variant="subtle">
      Smoke ({run.numTrials} {run.numTrials === 1 ? "trial" : "trials"})
    </Badge>
  );
}

const VERDICT_STYLE: Record<
  Verdict,
  { palette: string; label: string; icon: React.ReactNode }
> = {
  pass: { palette: "green", label: "pass", icon: <CheckCircleIcon /> },
  fail: { palette: "red", label: "fail", icon: <XCircleIcon /> },
  error: { palette: "orange", label: "error", icon: <WarningCircleIcon /> },
  uncovered: {
    palette: "gray",
    label: "uncovered",
    icon: <CircleDashedIcon />,
  },
};

export function VerdictChip({ verdict }: { readonly verdict: Verdict }) {
  const style = VERDICT_STYLE[verdict];
  return (
    <Badge colorPalette={style.palette} variant="subtle">
      {style.icon}
      {style.label}
    </Badge>
  );
}
