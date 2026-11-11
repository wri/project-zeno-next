"use client";

import {
  MapTrifoldIcon,
  PolygonIcon,
  SelectionPlusIcon,
  StackSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import {
  CHECKLIST_ITEM_IDS,
  type ChecklistItemId,
} from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import { DATA_CATALOG_LABEL } from "@/app/components/CatalogPanel";
import { ChatContextOptions } from "@/app/components/ContextButton";
import { WIDGET_CONTROL_LABELS } from "@/app/components/WidgetMessage";
import { ANALYSES_LABEL } from "@/app/components/chatInputLabels";
import { SHOW_PARAMS_LABEL } from "@/app/components/widgets/AnalysisParameters";
import { DOWNLOAD_LABEL } from "@/app/components/widgets/DownloadMenu";
import {
  closeExplorationPanels,
  openAreasPanel,
  openDataCatalog,
} from "../app-actions";
import { TOUR_ANCHORS } from "@/src/shared/lib/tour-anchors";
import { Example, InlineIcon, Tip } from "../tour-content";
import { anchorTarget } from "../../model/tour";
import type { UiTour, UiTourStep } from "../types";

// UI labels come from the components that render them, so a rename reaches
// the copy too (checked by tests/architecture/tour-contract.test.ts).
const DATASETS_LABEL = ChatContextOptions.layer.label;
const AREAS_LABEL = ChatContextOptions.area.label;

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
        title: `${DATASETS_LABEL} live here`,
        body: (
          <p>
            <InlineIcon icon={StackSimpleIcon} /> <b>{DATASETS_LABEL}</b> opens
            the {DATA_CATALOG_LABEL}.
          </p>
        ),
      },
      {
        id: "data-catalog",
        target: anchorTarget(TOUR_ANCHORS.catalogPanel),
        placement: "right",
        onEnter: openDataCatalog,
        title: "Switch a dataset on",
        body: (
          <p>
            Search or pick a category, then use the switch on a row to add the
            dataset as a layer. Active layers are pinned under <b>On map</b>,
            and they are included with your next question.
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
            switch it off in the catalogue.{" "}
            <InlineIcon icon={StackSimpleIcon} /> <b>{DATASETS_LABEL}</b> in
            this header opens the catalogue again.
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
        title: `${AREAS_LABEL} live here`,
        body: (
          <p>
            <InlineIcon icon={PolygonIcon} /> <b>{AREAS_LABEL}</b> opens the
            boundary layers and your saved areas.
          </p>
        ),
      },
      {
        id: "area-panel",
        target: anchorTarget(TOUR_ANCHORS.areasPanel),
        placement: "right",
        onEnter: openAreasPanel,
        title: "Search, or show a boundary",
        body: (
          <p>
            Search for a place, or turn on a boundary layer under{" "}
            <b>Boundaries</b> (administrative areas, Key Biodiversity Areas,
            protected areas, Indigenous lands or commodities) and click an area
            on the map. Only one boundary layer shows at a time. Areas from your
            chat are under <b>In this conversation</b>.
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
            <InlineIcon icon={SelectionPlusIcon} /> <b>Draw on map</b> makes a
            shape, or <InlineIcon icon={UploadSimpleIcon} /> <b>Upload file</b>{" "}
            adds a boundary file. Saved shapes appear under <b>My areas</b>,
            also in the menu.
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
              Switch between <b>{WIDGET_CONTROL_LABELS.chart}</b> and{" "}
              <b>{WIDGET_CONTROL_LABELS.table}</b>, use{" "}
              <b>{WIDGET_CONTROL_LABELS.showWorking}</b> to see how it was made,
              and <b>{SHOW_PARAMS_LABEL}</b> to check the inputs.{" "}
              <b>{DOWNLOAD_LABEL}</b> saves the data.
            </p>
            <Tip>
              Nothing highlighted? No analysis is open yet. Ask a question
              first, then come back.
            </Tip>
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
              Ask for imagery of a place and date and it&apos;s loaded onto the
              map. We&apos;ve put an example in the chat box for you to send
              when you&apos;re ready.
            </p>
            <Tip>
              Sentinel-2 covers most places. In the Amazon, Planet monthly
              mosaics (from September 2020) show under disturbance alerts.
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
            <InlineIcon icon={MapTrifoldIcon} />.
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
            <b>{ANALYSES_LABEL}</b> has tabs for <b>Curated</b>,{" "}
            <b>AI generated</b> and <b>In this conversation</b>.{" "}
            <b>Add to dashboard</b> saves one to a dashboard for its area, where
            you can add notes and build a report. Open your dashboards from{" "}
            <b>Dashboards</b> in the menu.
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
