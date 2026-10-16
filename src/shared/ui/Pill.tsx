import { Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import { InfoTooltip } from "./InfoTooltip";

export interface PillOption<T extends string | undefined = string> {
  value: T;
  label: string;
}

/**
 * How the label reads: `mono` is the design's uppercase mono caption
 * (DETAIL, MEASURE); `text` is a plain "Confidence:" in body text, as the
 * alerts widget's filter dropdowns.
 */
export type PillVariant = "mono" | "text";

export interface PillProps<T extends string | undefined = string> {
  label: string;
  /** The chosen option's value; the pill shows that option's label. */
  value: T;
  options: PillOption<T>[];
  onSelect: (value: T) => void;
  /** Matches the widest option label across both curated net-flux/tree pills. */
  minW?: string;
  /** Tooltip body for an info icon rendered inside the pill, after the caret. */
  info?: React.ReactNode;
  variant?: PillVariant;
}

const LABEL_STYLE = {
  mono: {
    fontFamily: "mono",
    fontSize: "10px",
    fontWeight: "400",
    lineHeight: "16px",
    letterSpacing: "0.5px",
    color: "#4A64CB",
  },
  text: {
    fontFamily: "body",
    fontSize: "12px",
    fontWeight: "normal",
    lineHeight: "16px",
    color: "#565E7B",
  },
} as const;

const VALUE_COLOR = { mono: "#656E7B", text: "#131619" } as const;

/**
 * The design's dropdown pill: a label, the current value, and a caret.
 * Shared by the net-flux DETAIL/MEASURE pills, the flux-tree MEASURE pill and
 * the alerts widget's Confidence/Intersects filters — every "Label: value ▾"
 * control renders the identical chrome, styled from the same design spec.
 *
 * The pill chrome sits on a wrapper so the optional info icon is a sibling of
 * the menu trigger rather than a child of its `<button>`: hovering the icon
 * opens only the tooltip, with no click guards needed.
 */
export function Pill<T extends string | undefined = string>({
  label,
  value,
  options,
  onSelect,
  minW = "140px",
  info,
  variant = "mono",
}: PillProps<T>) {
  const current = options.find((option) => option.value === value);
  return (
    <Flex
      align="center"
      gap="4px"
      h="24px"
      pr={info ? "8px" : 0}
      bg="white"
      border="1px solid"
      borderColor="#E0E2E5"
      rounded="4px"
      _hover={{ bg: "neutral.100" }}
    >
      <Menu.Root positioning={{ placement: "bottom-start" }}>
        <Menu.Trigger asChild>
          <Button
            variant="plain"
            h="100%"
            pl={variant === "text" ? "10px" : "8px"}
            pr={info ? 0 : "8px"}
            gap={variant === "text" ? "6px" : "4px"}
            border="none"
            // The button recipe sizes every descendant svg to 20px; let the
            // caret keep its declared size.
            _icon={{ width: "auto", height: "auto" }}
            aria-label={`${label}: ${current?.label ?? ""}`}
          >
            <Text {...LABEL_STYLE[variant]}>
              {label}
              {variant === "text" && ":"}
            </Text>
            <Text
              fontFamily="body"
              fontSize="12px"
              fontWeight="medium"
              color={VALUE_COLOR[variant]}
            >
              {current?.label}
            </Text>
            <CaretDownIcon
              size={variant === "text" ? 10 : 12}
              color={VALUE_COLOR[variant]}
            />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW={minW} zIndex={1400}>
              {options.map((option) => (
                <Menu.Item
                  key={option.label}
                  value={option.value ?? option.label}
                  onSelect={() => onSelect(option.value)}
                  fontSize="12px"
                >
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      {info && <InfoTooltip about={label}>{info}</InfoTooltip>}
    </Flex>
  );
}
