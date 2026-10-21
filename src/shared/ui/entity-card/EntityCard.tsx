import { Box, Flex, Switch, Text, chakra } from "@chakra-ui/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useRef, type MouseEvent, type ReactNode } from "react";

import {
  ENTITY_KINDS,
  KIND_INFO_LABEL,
  VERIFICATION_EYEBROW,
  type AnalysisVerification,
  type EntityKind,
  type EyebrowSpec,
} from "./entity-kinds";
import { InfoButton } from "./InfoButton";
import { toggleAriaLabel, type ToggleVerb } from "./toggle-aria-label";

/** Side of the card's square thumbnail slot. */
export const ENTITY_CARD_THUMBNAIL_PX = 44;
const ARROW_CLASS = "entity-card-arrow";

/**
 * How the card responds to the user.
 * - `static`: it only shows (chat cards), with the heavier chat-card outline.
 * - `toggle`: a switch; a click anywhere on the row flips it.
 * - `link`: a button stretched over the whole card (e.g. open a dashboard);
 *   the actions and (i) stay separate controls above it.
 */
export type CardInteraction =
  | { mode: "static" }
  | {
      mode: "toggle";
      checked: boolean;
      onChange: (checked: boolean) => void;
      /** What the switch does; names it for assistive tech and analytics. Defaults to "map". */
      verb?: ToggleVerb;
      /** Status text beside the switch ("Add to dashboard", "Running..."). */
      status?: string;
      /** Disables the switch and the row click. */
      disabled?: boolean;
      /** Identifies the panel for analytics (GTM), on the switch. */
      dataPanel?: string;
    }
  | { mode: "link"; onClick: () => void; ariaLabel: string };

export interface EntityCardProps {
  kind: EntityKind;
  /** Analyses only: renders the merged CURATED / AI-ASSISTED ANALYSIS eyebrow. */
  verification?: AnalysisVerification;
  title: string;
  /** Mono meta line under the title ("annual · global · UMD"). */
  meta?: string;
  /** Small trailing badge after the text (VIEW ONLY). */
  badge?: ReactNode;
  /** Fills a 44px square (image, area outline, glyph). The kind's glyph when omitted. */
  thumbnail?: ReactNode;
  /** Shows the kind eyebrow (AREA, DATA, …) — chat cards, where no panel header says it. */
  showKind?: boolean;
  interaction?: CardInteraction;
  /** Shows the (i) button. */
  onInfo?: () => void;
  /** (i) tooltip; defaults per kind ("Show dataset info", "View analysis"). */
  infoLabel?: string;
  /** Buttons before the (i) and the switch (locate, kebab, Try again). */
  actions?: ReactNode;
}

/**
 * The compact row behind every card in the app: thumbnail, optional eyebrow,
 * title, meta, then badge, actions, (i) and the control. Width comes from the
 * list it sits in.
 *
 * In `toggle` mode the whole row is a pointer target, but the switch stays the
 * accessible control (focusable, labelled) — making the row a `<button>` would
 * nest the info and action buttons inside it. Analytics (GTM) tracks toggles
 * by the switch's `data-panel` and aria-label, so a row click is forwarded as a
 * real click on the switch's root `<label>` rather than calling `onChange`
 * directly, and nothing here stops propagation (that would hide the click
 * from GTM's document listener).
 *
 * In `link` mode the control is a real `<button>` laid over the row, so a
 * click anywhere opens the card and Enter / Space come from the browser. The
 * actions and (i) are its siblings, stacked above it, not its children: a
 * button's content is presentational to assistive tech, so buttons nested in
 * one go unannounced.
 */
export function EntityCard({
  kind,
  verification,
  title,
  meta,
  badge,
  thumbnail,
  showKind = false,
  interaction = { mode: "static" },
  onInfo,
  infoLabel,
  actions,
}: EntityCardProps) {
  const switchRef = useRef<HTMLLabelElement>(null);
  const trailingRef = useRef<HTMLDivElement>(null);
  const toggle = interaction.mode === "toggle" ? interaction : null;
  const link = interaction.mode === "link" ? interaction : null;
  const toggleable = !!toggle && !toggle.disabled;
  const clickable = toggleable || !!link;
  // A static card sits in chat beside the AREA and ANALYSIS cards (InfoCard),
  // so it takes their outline; panel and picker rows keep the lighter token.
  const restingBorder =
    interaction.mode === "static"
      ? "rgba(19, 22, 25, 0.3)"
      : "border.emphasized";

  /** True for a click on the row itself — not on a child control or a portal. */
  function isRowClick(e: MouseEvent<HTMLDivElement>): boolean {
    const target = e.target as Node;
    // React bubbles clicks from portals (menus, dialogs) through here.
    if (!e.currentTarget.contains(target)) return false;
    // Actions, (i) and the switch handle their own clicks.
    if (trailingRef.current?.contains(target)) return false;
    if (switchRef.current?.contains(target)) return false;
    return true;
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (isRowClick(e)) switchRef.current?.click();
  }

  const kindSpec = ENTITY_KINDS[kind];
  const KindIcon = kindSpec.Icon;
  const eyebrow: EyebrowSpec | null = verification
    ? VERIFICATION_EYEBROW[verification]
    : showKind
      ? {
          label: kindSpec.label,
          color: kindSpec.color,
          Icon: kindSpec.plainEyebrow ? undefined : KindIcon,
        }
      : null;

  return (
    <Flex
      w="100%"
      minW={0}
      flexShrink={0}
      align="center"
      gap="10px"
      p="6px"
      bg="#FFFFFF"
      border={toggle?.checked ? "2px solid" : "1px solid"}
      borderColor={toggle?.checked ? "primary.solid" : restingBorder}
      borderRadius="4px"
      cursor={clickable ? "pointer" : undefined}
      transition="border-color 0.16s ease, background-color 0.16s ease"
      _hover={clickable ? { bg: "#FAFBFC" } : undefined}
      _active={link ? { bg: "#F0F4FF", borderColor: "#0049AA" } : undefined}
      css={link ? { [`&:hover .${ARROW_CLASS}`]: { opacity: 1 } } : undefined}
      position={link ? "relative" : undefined}
      onClick={toggleable ? handleClick : undefined}
    >
      {link && (
        // Over the border too (-1px), so its focus ring sits where the card's
        // edge is.
        <chakra.button
          type="button"
          aria-label={link.ariaLabel}
          onClick={link.onClick}
          position="absolute"
          inset="-1px"
          borderRadius="4px"
          cursor="pointer"
          _focusVisible={{ outline: "2px solid #0049AA", outlineOffset: "2px" }}
        />
      )}
      <Flex
        w={`${ENTITY_CARD_THUMBNAIL_PX}px`}
        h={`${ENTITY_CARD_THUMBNAIL_PX}px`}
        flexShrink={0}
        align="center"
        justify="center"
        bg="gray.50"
        borderRadius="2px"
        overflow="hidden"
      >
        {thumbnail ?? <KindIcon size={20} color={kindSpec.color} />}
      </Flex>
      <Box flex="1" minW={0}>
        {eyebrow && <Eyebrow spec={eyebrow} />}
        <Text
          fontFamily="body"
          fontSize="12px"
          fontWeight="semibold"
          lineHeight="150%"
          color="#3A4048"
          truncate
        >
          {title}
        </Text>
        {meta && (
          <Text
            fontFamily="mono"
            fontSize="10px"
            lineHeight="16px"
            color="#656E7B"
            truncate
          >
            {meta}
          </Text>
        )}
      </Box>
      {badge}
      {(actions || onInfo) && (
        <Flex
          ref={trailingRef}
          align="center"
          gap="4px"
          flexShrink={0}
          // Above the link button, which would otherwise take their clicks.
          position={link ? "relative" : undefined}
          zIndex={link ? 1 : undefined}
        >
          {actions}
          {onInfo && (
            <InfoButton
              title={title}
              label={infoLabel ?? KIND_INFO_LABEL[kind]}
              onClick={onInfo}
            />
          )}
        </Flex>
      )}
      {toggle && (
        <Flex align="center" gap="6px" flexShrink={0}>
          {toggle.status && (
            <Text
              fontFamily="mono"
              fontSize="10px"
              lineHeight="16px"
              color="#656E7B"
              whiteSpace="nowrap"
            >
              {toggle.status}
            </Text>
          )}
          <Switch.Root
            ref={switchRef}
            size="sm"
            checked={toggle.checked}
            onCheckedChange={(e: { checked: boolean }) =>
              toggle.onChange(e.checked)
            }
            disabled={toggle.disabled}
            colorPalette="primary"
            aria-label={toggleAriaLabel(
              toggle.verb ?? "map",
              title,
              toggle.checked
            )}
            data-panel={toggle.dataPanel}
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb bg="white" />
            </Switch.Control>
          </Switch.Root>
        </Flex>
      )}
      {link && (
        <Flex
          className={ARROW_CLASS}
          flexShrink={0}
          mr="4px"
          opacity={0}
          transition="opacity 0.16s ease"
          color="#656E7B"
          aria-hidden="true"
        >
          <ArrowRightIcon size={18} />
        </Flex>
      )}
    </Flex>
  );
}

function Eyebrow({ spec }: { spec: EyebrowSpec }) {
  const { Icon } = spec;
  return (
    <Flex align="center" gap="4px" minW={0}>
      {Icon && (
        <Icon
          size={12}
          color={spec.iconColor ?? spec.color}
          weight={spec.iconWeight}
        />
      )}
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        letterSpacing="0.5px"
        color={spec.color}
        textTransform="uppercase"
        truncate
      >
        {spec.label}
      </Text>
    </Flex>
  );
}
