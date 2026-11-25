import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  ButtonGroup,
  Flex,
  Input,
  Popover,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  CLOUD_OPTIONS,
  FIRST_SCENE_DATE,
  WINDOW_OPTIONS,
  type Sentinel2Request,
} from "../model/request";
import { SCENE_LIMITS, type CaptureStatus } from "../model/scenes";

/** What a request would show, for the preview line. */
export interface ScenePreview {
  status: Exclude<CaptureStatus, "searching">;
  /** Scenes the map would draw, after the scene limits. */
  sceneCount: number;
  /** Scenes the search found, before the limits. */
  found: number;
}

const PREVIEW_DEBOUNCE_MS = 400;

const todayIso = () => new Date().toISOString().slice(0, 10);

function previewText(preview: ScenePreview): string {
  switch (preview.status) {
    case "no_scenes":
      return "No scenes. Try a wider window or a higher cloud limit.";
    case "too_large":
      return "This area is too large for satellite imagery.";
    case "error":
      return "Couldn't search for scenes.";
    case "ok":
      return preview.found > preview.sceneCount
        ? `${preview.found} scenes found, the best ${preview.sceneCount} are shown`
        : `${preview.sceneCount} scene${preview.sceneCount === 1 ? "" : "s"} in range`;
  }
}

/** Mono label above a control, as on the legend chips. */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text fontFamily="mono" fontSize="10px" color="#737C94" mb="6px">
      {children}
    </Text>
  );
}

function Segmented<T extends number>(props: {
  label: string;
  options: readonly T[];
  value: T;
  format: (value: T) => string;
  onChange: (value: T) => void;
}) {
  const { label, options, value, format, onChange } = props;
  return (
    <ButtonGroup size="xs" attached variant="outline" w="100%" role="group">
      {options.map((option) => (
        <Button
          key={option}
          flex={1}
          fontFamily="mono"
          fontSize="11px"
          aria-pressed={option === value}
          aria-label={`${label} ${format(option)}`}
          {...(option === value
            ? {
                bg: "primary.50",
                color: "primary.700",
                borderColor: "primary.300",
              }
            : {})}
          onClick={() => onChange(option)}
        >
          {format(option)}
        </Button>
      ))}
    </ButtonGroup>
  );
}

/**
 * The imagery legend's Edit popover: date, search window and cloud limit for
 * the live capture's area. While the user changes them, a debounced search
 * previews how many scenes the map would show. "Show imagery" adds a new
 * capture (the old one stays in the captures list); Cancel changes nothing.
 */
export function ImageryFilterPopover(props: {
  request: Sentinel2Request;
  onApply: (request: Sentinel2Request) => void;
  preview: (request: Sentinel2Request) => Promise<ScenePreview>;
  children: ReactNode;
}) {
  const { request, onApply, preview, children } = props;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(request);
  // The last preview and the draft it was for: the line shows "Searching"
  // until a result for the current draft arrives.
  const [previewed, setPreviewed] = useState<{
    draft: Sentinel2Request;
    result: ScenePreview;
  } | null>(null);
  const result = previewed?.draft === draft ? previewed.result : null;

  useEffect(() => {
    if (!open || !draft.targetDate) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      preview(draft).then((next) => {
        if (!cancelled) setPreviewed({ draft, result: next });
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, draft, preview]);

  const today = todayIso();
  const dateValid =
    draft.targetDate >= FIRST_SCENE_DATE && draft.targetDate <= today;
  const set = (patch: Partial<Sentinel2Request>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <Popover.Root
      open={open}
      onOpenChange={(e) => {
        // Each opening starts from the live capture's values. Not an effect
        // on `request`: the legend rebuilds it on every layer change, which
        // would wipe the user's edits while the popover is open.
        if (e.open) setDraft(request);
        setOpen(e.open);
      }}
      positioning={{
        placement: "top",
        strategy: "fixed",
        hideWhenDetached: true,
      }}
      size="xs"
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content w="290px">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <Popover.Body display="flex" flexDir="column" gap={3} p={3}>
            <div>
              <FieldLabel>DATE</FieldLabel>
              <Flex gap={2}>
                <Input
                  type="date"
                  size="xs"
                  flex={1}
                  aria-label="Imagery date"
                  min={FIRST_SCENE_DATE}
                  max={today}
                  value={draft.targetDate}
                  onChange={(e) => set({ targetDate: e.target.value })}
                />
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => set({ targetDate: today })}
                >
                  Latest
                </Button>
              </Flex>
              {!dateValid && (
                <Text fontSize="10px" color="fg.error" mt={1}>
                  Pick a date from {FIRST_SCENE_DATE} to today.
                </Text>
              )}
            </div>
            <div>
              <FieldLabel>WINDOW</FieldLabel>
              <Segmented
                label="Window"
                options={WINDOW_OPTIONS}
                value={draft.windowDays as (typeof WINDOW_OPTIONS)[number]}
                format={(v) => `±${v} d`}
                onChange={(windowDays) => set({ windowDays })}
              />
            </div>
            <div>
              <FieldLabel>MAX CLOUD COVER</FieldLabel>
              <Segmented
                label="Max cloud cover"
                options={CLOUD_OPTIONS}
                value={draft.maxCloudCover as (typeof CLOUD_OPTIONS)[number]}
                format={(v) => `${v}%`}
                onChange={(maxCloudCover) => set({ maxCloudCover })}
              />
            </div>
            <Flex
              alignItems="center"
              gap={1.5}
              minH="18px"
              fontSize="xs"
              color="fg.muted"
              aria-live="polite"
            >
              {!result ? (
                <>
                  <Spinner size="xs" />
                  <Text>Searching scenes…</Text>
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon />
                  <Text>{previewText(result)}</Text>
                </>
              )}
            </Flex>
            <Text fontSize="10px" color="fg.muted" mt={-2}>
              Up to {SCENE_LIMITS.maxScenes} scenes, the nearest to the date.
            </Text>
            <Flex justifyContent="flex-end" gap={2}>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                colorPalette="primary"
                disabled={!dateValid}
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
              >
                Show imagery
              </Button>
            </Flex>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
