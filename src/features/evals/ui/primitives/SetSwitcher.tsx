"use client";

import { Button, ButtonGroup } from "@chakra-ui/react";
import type { EvalSet } from "../../model/types";

const LABELS: Record<EvalSet, string> = {
  gold: "GOLD",
  challenge: "CHALLENGE",
};

/** Segmented GOLD/CHALLENGE switcher, synced to `?set=` by the caller. */
export function SetSwitcher({
  value,
  onChange,
}: {
  readonly value: EvalSet;
  readonly onChange: (set: EvalSet) => void;
}) {
  return (
    <ButtonGroup size="xs" variant="outline" attached>
      {(Object.keys(LABELS) as EvalSet[]).map((set) => (
        <Button
          key={set}
          onClick={() => onChange(set)}
          bg={value === set ? "bg.muted" : undefined}
          fontWeight={value === set ? "semibold" : "normal"}
        >
          {LABELS[set]}
        </Button>
      ))}
    </ButtonGroup>
  );
}
