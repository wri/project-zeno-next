import { useState } from "react";
import { Button, Flex, Input, Popover, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import type { DateRange } from "@/src/shared/lib/iso-date";
import { periodRangeProblem } from "../lib/alertsChart";

/** The Custom popover's two inputs, each editing one end of the range. */
const CUSTOM_BOUNDS: { bound: keyof DateRange; label: string }[] = [
  { bound: "start", label: "Start" },
  { bound: "end", label: "End" },
];

/** The design's filter pill: a rounded 24px chip, solid primary when on. */
export const pillProps = (selected: boolean) =>
  ({
    size: "xs",
    h: "24px",
    px: "10px",
    gap: "6px",
    rounded: "full",
    fontSize: "12px",
    fontWeight: "medium",
    colorPalette: selected ? "primary" : undefined,
    variant: selected ? "solid" : "outline",
    bg: selected ? undefined : "white",
    borderColor: selected ? undefined : "#E0E2E5",
    color: selected ? undefined : "#131619",
    // The button recipe sizes every descendant svg to 20px; the design's
    // chevron is 10px.
    _icon: { width: "auto", height: "auto" },
  }) as const;

/**
 * The Custom period pill: it selects the custom period (`onOpen`) and opens
 * a start and an end date under itself, each kept inside `bounds` and on
 * its side of the other. A range with a bound outside `bounds` (what a date
 * input reports while a year is still being typed) is ignored without
 * comment; one whose end is before its start says so. Only a range that
 * can be taken reaches `onChange`.
 *
 * The alerts list and the alerts chart share it, so their custom periods
 * look and behave alike.
 */
export function CustomPeriodPill({
  selected,
  disabled = false,
  custom,
  bounds,
  onOpen,
  onChange,
}: {
  selected: boolean;
  disabled?: boolean;
  /** The committed custom range, once the pill has been opened. */
  custom?: DateRange;
  /** The first and last day a custom range may cover. */
  bounds?: DateRange;
  onOpen: () => void;
  onChange: (range: DateRange) => void;
}) {
  // The dates open from the pill, which also selects the custom period, so
  // the popover is controlled rather than toggled by its trigger.
  const [open, setOpen] = useState(false);
  const [inverted, setInverted] = useState(false);

  const changeBound = (bound: keyof DateRange, value: string) => {
    if (!custom || !bounds || !value) return;
    const next = { ...custom, [bound]: value };
    const problem = periodRangeProblem(next, bounds);
    setInverted(problem === "inverted");
    if (!problem) onChange(next);
  };

  return (
    // Mounted on open, so the inputs start from the committed range each
    // time (they are uncontrolled: a controlled date input snaps a
    // half-typed year back on every keystroke the handler ignores).
    <Popover.Root
      open={open}
      onOpenChange={(e) => {
        setOpen(e.open);
        if (!e.open) setInverted(false);
      }}
      // Fixed, as the basemap selector's: the dashboard scrolls inside a
      // container, and an absolute positioner lands off the page.
      positioning={{ placement: "bottom-start", strategy: "fixed" }}
      lazyMount
      unmountOnExit
    >
      <Popover.Anchor asChild>
        <Button
          {...pillProps(selected)}
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => {
            onOpen();
            setInverted(false);
            setOpen(true);
          }}
        >
          Custom
          <CaretDownIcon size={10} />
        </Button>
      </Popover.Anchor>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="auto" zIndex={1400}>
            <Popover.Body p={3}>
              {custom && bounds && (
                <Flex direction="column" gap="8px">
                  <Flex gap="8px" align="center" wrap="wrap">
                    {CUSTOM_BOUNDS.map(({ bound, label }) => (
                      <Text
                        key={bound}
                        as="label"
                        fontSize="12px"
                        color="#565E7B"
                      >
                        {label}{" "}
                        <Input
                          type="date"
                          size="xs"
                          w="auto"
                          display="inline-block"
                          bg="white"
                          defaultValue={custom[bound]}
                          // Each input stops at the other's day: the picker
                          // greys the rest, and a typed date past it is
                          // refused above.
                          min={bound === "start" ? bounds.start : custom.start}
                          max={bound === "start" ? custom.end : bounds.end}
                          aria-label={`Custom period ${bound}`}
                          onChange={(e) => changeBound(bound, e.target.value)}
                        />
                      </Text>
                    ))}
                  </Flex>
                  {inverted && (
                    <Text fontSize="12px" color="#B91C1C" aria-live="polite">
                      End must be on or after start.
                    </Text>
                  )}
                </Flex>
              )}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
