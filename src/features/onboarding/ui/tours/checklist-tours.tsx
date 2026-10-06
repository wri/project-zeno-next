"use client";

import {
  DownloadSimpleIcon,
  InfoIcon,
  PencilSimpleIcon,
  PolygonIcon,
  StackIcon,
  StackSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import {
  CHECKLIST_ITEM_IDS,
  type ChecklistItemId,
} from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import {
  closeExplorationPanels,
  openAreasPanel,
  openDataCatalog,
} from "../app-actions";
import { TOUR_ANCHORS } from "@/src/shared/lib/tour-anchors";
import { Example, InlineIcon, Tip } from "../tour-content";
import { anchorTarget } from "../../model/tour";
import type { UiTour, UiTourStep } from "../types";

export interface ChecklistItem {
  readonly id: ChecklistItemId;
  readonly label: string;
  /** Rough time to complete, shown beside the label. */
  readonly duration: string;
  readonly steps: readonly UiTourStep[];
}

/** Keyed by id, so the compiler catches a missing or unknown item. */
const ITEMS: Record<ChecklistItemId, Omit<ChecklistItem, "id">> = {
  ask: {
    label: "Ask your first question",
    duration: "30s",
    steps: [
      {
        id: "ask-input",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        title: "Ask in plain language",
        body: (
          <>
            <p>Include an area, a dataset and a time range:</p>
            <Example>
              How much natural land was converted to cropland in Spain between
              2015 and 2024?
            </Example>
            <Tip>
              Dates come from what you type, e.g. “since 2015” or “last year”.
            </Tip>
          </>
        ),
      },
      {
        id: "ask-samples",
        target: anchorTarget(TOUR_ANCHORS.samplePrompts),
        placement: "right",
        optional: true,
        title: "Or start from a suggestion",
        body: (
          <p>
            Click any suggestion to run it. They&apos;re a quick way to see what
            Horizon can answer.
          </p>
        ),
      },
    ],
  },
  data: {
    label: "Add a dataset to the map",
    duration: "40s",
    steps: [
      {
        id: "data-button",
        target: anchorTarget(TOUR_ANCHORS.datasetsButton),
        placement: "top",
        padding: 5,
        onEnter: closeExplorationPanels,
        title: "Datasets live here",
        body: (
          <p>
            <InlineIcon icon={StackSimpleIcon} /> <b>Datasets</b> opens the Data
            catalog.
          </p>
        ),
      },
      {
        id: "data-catalog",
        target: anchorTarget(TOUR_ANCHORS.catalogPanel),
        placement: "right",
        onEnter: openDataCatalog,
        title: "Turn on Show on map",
        body: (
          <p>
            Each card shows what the dataset covers and how far back it goes.{" "}
            <b>Show on map</b> adds it as a layer, and layers you turn on are
            included with your next question.
          </p>
        ),
      },
      {
        id: "data-legend",
        target: anchorTarget(TOUR_ANCHORS.mapLegend),
        placement: "left",
        optional: true,
        onEnter: closeExplorationPanels,
        title: "It appears in Map layers",
        body: (
          <p>
            Change a layer&apos;s opacity or read about it here. To remove it,
            switch it off in the catalog.
          </p>
        ),
      },
    ],
  },
  area: {
    label: "Change your area",
    duration: "40s",
    steps: [
      {
        id: "area-button",
        target: anchorTarget(TOUR_ANCHORS.areasButton),
        placement: "top",
        padding: 5,
        onEnter: closeExplorationPanels,
        title: "Areas live here",
        body: (
          <p>
            <InlineIcon icon={PolygonIcon} /> <b>Areas</b> opens the boundary
            layers and your saved areas.
          </p>
        ),
      },
      {
        id: "area-panel",
        target: anchorTarget(TOUR_ANCHORS.areasPanel),
        placement: "right",
        onEnter: openAreasPanel,
        title: "Show a boundary, then click the map",
        body: (
          <p>
            Turn on one boundary layer (administrative areas, Key Biodiversity
            Areas, protected areas or Indigenous lands), then click an area on
            the map to select it. Only one boundary layer shows at a time.
          </p>
        ),
      },
      {
        id: "area-tools",
        target: anchorTarget(TOUR_ANCHORS.areaTools),
        placement: "bottom",
        padding: 4,
        optional: true,
        title: "Or draw or upload your own",
        body: (
          <p>
            <InlineIcon icon={PencilSimpleIcon} /> Draw a shape on the map, or{" "}
            <InlineIcon icon={UploadSimpleIcon} /> upload a boundary file. Saved
            shapes appear under <b>My areas</b>, also in the menu.
          </p>
        ),
      },
    ],
  },
  insight: {
    label: "Read an insight",
    duration: "30s",
    steps: [
      {
        id: "insight-card",
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        title: "Answers open on the map",
        body: (
          <>
            <p>
              Switch between chart and table,{" "}
              <InlineIcon icon={DownloadSimpleIcon} /> download CSV or PNG, and{" "}
              <InlineIcon icon={InfoIcon} /> check sources, method and caveats.
            </p>
            <Tip>Run an analysis first if nothing is highlighted.</Tip>
          </>
        ),
      },
    ],
  },
  imagery: {
    label: "See satellite imagery",
    duration: "20s",
    steps: [
      {
        id: "imagery-ask",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        onEnter: () =>
          useOnboardingStore
            .getState()
            .setDraftPrompt("Show recent satellite imagery of the Mau Forest"),
        title: "Ask for imagery in chat",
        body: (
          <>
            <p>
              Ask for Sentinel-2 imagery of any place and date and it&apos;s
              loaded onto the map. We&apos;ve put an example in the chat box for
              you to send when you&apos;re ready.
            </p>
            <Tip>
              Imagery works for areas up to about 50,000 km², so pick a park or
              district rather than a whole country.
            </Tip>
          </>
        ),
      },
      {
        id: "imagery-basemap",
        target: anchorTarget(TOUR_ANCHORS.basemapButton),
        placement: "left",
        padding: 4,
        optional: true,
        title: "Or switch the basemap",
        body: (
          <p>
            For a general satellite backdrop, change the basemap with{" "}
            <InlineIcon icon={StackIcon} />.
          </p>
        ),
      },
    ],
  },
  dashboard: {
    label: "Save to a dashboard",
    duration: "20s",
    steps: [
      {
        id: "dashboard-analyses",
        target: anchorTarget(TOUR_ANCHORS.analysesButton),
        placement: "top",
        padding: 5,
        onEnter: closeExplorationPanels,
        title: "Keep the analyses you like",
        body: (
          <p>
            <b>Analyses</b> lists every analysis from your conversations.{" "}
            <b>Add to dashboard</b> saves one to a dashboard for its area, where
            you can add notes and build a report. Open your dashboards from the{" "}
            <b>Dashboards</b> tab.
          </p>
        ),
      },
      {
        id: "dashboard-ask",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        title: "Or ask for one",
        body: (
          <p>
            You can also ask the assistant to “create a dashboard for this
            area”.
          </p>
        ),
      },
    ],
  },
};

/** The checklist's items, in `CHECKLIST_ITEM_IDS` order. */
export const CHECKLIST_ITEMS: readonly ChecklistItem[] = CHECKLIST_ITEM_IDS.map(
  (id) => ({ id, ...ITEMS[id] })
);

/** A checklist item's walkthrough; finishing it ticks the item off. */
export function createChecklistTour(item: ChecklistItem): UiTour {
  const last = item.steps.length - 1;
  return {
    id: `checklist-${item.id}`,
    steps: item.steps.map((s, i) =>
      i === last ? { ...s, ctaLabel: s.ctaLabel ?? "Done" } : s
    ),
    onEnd: (completed) => {
      closeExplorationPanels();
      if (completed) useOnboardingStore.getState().markChecklistDone([item.id]);
    },
  };
}
