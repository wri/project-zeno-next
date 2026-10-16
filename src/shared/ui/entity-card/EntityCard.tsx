import { Box, Flex, Switch, Text } from "@chakra-ui/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import {
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

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

const THUMBNAIL_PX = 44;
const ARROW_CLASS = "entity-card-arrow";

/**
 * How the card responds to the user.
 * - `static`: it only shows (chat cards).
 * - `toggle`: a switch; a click anywhere on the row flips it.
 * - `link`: the whole card is the button (e.g. open a dashboard).
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

const STATIC: CardInteraction = { mode: "static" };

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
 */
export function EntityCard({
  kind,
  verification,
  title,
  meta,
  badge,
  thumbnail,
  showKind = false,
  interaction = STATIC,
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
    if (!isRowClick(e)) return;
    if (toggleable) switchRef.current?.click();
    else link?.onClick();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!link || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      link.onClick();
    }
  }

  const kindSpec = ENTITY_KINDS[kind];
  const KindIcon = kindSpec.Icon;
  const eyebrow: EyebrowSpec | null = verification
    ? VERIFICATION_EYEBROW[verification]
    : showKind
      ? kindSpec
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
      borderColor={toggle?.checked ? "primary.solid" : "rgba(19, 22, 25, 0.3)"}
      borderRadius="4px"
      cursor={clickable ? "pointer" : undefined}
      transition="border-color 0.16s ease, background-color 0.16s ease"
      _hover={clickable ? { bg: "#FAFBFC" } : undefined}
      _active={link ? { bg: "#F0F4FF", borderColor: "#0049AA" } : undefined}
      _focusVisible={
        link
          ? { outline: "2px solid #0049AA", outlineOffset: "2px" }
          : undefined
      }
      css={link ? { [`&:hover .${ARROW_CLASS}`]: { opacity: 1 } } : undefined}
      role={link ? "button" : undefined}
      tabIndex={link ? 0 : undefined}
      aria-label={link?.ariaLabel}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={link ? handleKeyDown : undefined}
    >
      <Flex
        w={`${THUMBNAIL_PX}px`}
        h={`${THUMBNAIL_PX}px`}
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
        <Flex ref={trailingRef} align="center" gap="4px" flexShrink={0}>
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
