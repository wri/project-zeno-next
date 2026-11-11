"use client";

import {
  ChartLineIcon,
  FilePdfIcon,
  PrinterIcon,
  SelectionPlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import {
  CHECKLIST_ITEM_IDS,
  type ChecklistItemId,
  type ChecklistTickedBy,
} from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import { AI_ASSISTANT_LABEL } from "@/app/ChatPanelHeader";
import { AREA_ACTION_LABELS } from "@/app/components/AreaActionBar";
import { ANALYSES_LABEL } from "@/app/components/ChatInput";
import {
  DATASET_CARD_BY_ID,
  INTEGRATED_ALERTS_DATASET_ID,
} from "@/app/constants/datasets";
import { selectLayerOptions, type LayerId } from "@/app/types/map";
import { viewAnalysisNudgeLabel } from "@/src/features/analysis";
import {
  ADD_TO_DASHBOARD_LABEL,
  DASHBOARD_EXPORT_LABEL,
  SAVE_AS_PDF_LABEL,
  createDashboardNudgeLabel,
} from "@/src/features/dashboards";
import {
  clearDatasetLayers,
  closeExplorationPanels,
  openAreasPanel,
  openDataCatalog,
  prefillChatInput,
} from "../app-actions";
import { TOUR_ANCHORS, catalogCardAnchor } from "@/src/shared/lib/tour-anchors";
import { DailyPromptsNote, Example, InlineIcon, Tip } from "../tour-content";
import { anchorTarget } from "../../model/tour";
import type { UiTour, UiTourStep } from "../types";

const ALERTS_NAME =
  DATASET_CARD_BY_ID[INTEGRATED_ALERTS_DATASET_ID].dataset_name;
// Typed so the build fails if the layer the copy names is removed.
const OIL_PALM_LAYER: LayerId = "OIL_PALM";
const OIL_PALM_NAME = selectLayerOptions.find(
  (o) => o.id === OIL_PALM_LAYER
)?.name;

/** Content version of the guides, sent with tour telemetry. */
export const CHECKLIST_TOURS_VERSION = 2;

/** The last step's button: the guide ends, the task is the user's to do. */
export const GUIDE_DONE_LABEL = "Got it";

/** The button that ticks a task the app can't see being done. */
export const MANUAL_TICK_LABEL = "I have done this";

const COMPARE_PROMPT =
  "Compare tree cover loss in Kenya and Tanzania between 2015 and 2024.";
const IMAGERY_PROMPT = "Show recent satellite imagery of the Mau Forest";

const NO_PROMPTS_LEFT =
  "You have used all your daily prompts. They refresh every 24 hours.";

export interface ChecklistItem {
  readonly id: ChecklistItemId;
  readonly label: string;
  /**
   * How the task gets ticked: `detected` from what the app shows (see
   * `checklistEvidence`), `manual` by the user's own word when the app
   * can't see it (the PDF is made in another tab).
   */
  readonly completion: ChecklistTickedBy;
  /** A short guide to where the task starts. It never ticks the task. */
  readonly steps: readonly UiTourStep[];
}

/** Keyed by id, so the compiler catches a missing or unknown item. */
const ITEMS: Record<ChecklistItemId, Omit<ChecklistItem, "id">> = {
  alerts: {
    label: "Check recent alerts for an area",
    completion: "detected",
    steps: [
      {
        id: "alerts-row",
        target: anchorTarget(catalogCardAnchor(INTEGRATED_ALERTS_DATASET_ID)),
        placement: "right",
        // View analysis offers the first dataset on the map: with the default
        // one still there, it would offer that instead of the alerts.
        onEnter: () => {
          clearDatasetLayers();
          openDataCatalog();
        },
        title: `Turn on ${ALERTS_NAME}`,
        body: (
          <>
            <p>
              {ALERTS_NAME} show recent signs of disturbance to forests and
              other vegetation. They are updated daily.
            </p>
            <p>
              We have taken the other datasets off the map. Use the switch on
              this row. Then choose an area, and in the chat click{" "}
              <InlineIcon icon={ChartLineIcon} />{" "}
              <b>{viewAnalysisNudgeLabel(ALERTS_NAME, "…")}</b>
            </p>
            <Tip>
              An alert shows possible disturbance. It does not prove that forest
              was cleared.
            </Tip>
          </>
        ),
      },
    ],
  },
  "protected-area": {
    label: "Choose a protected area or concession",
    completion: "detected",
    steps: [
      {
        id: "protected-area-panel",
        target: anchorTarget(TOUR_ANCHORS.areasPanel),
        placement: "right",
        onEnter: openAreasPanel,
        title: "Find a protected area or concession",
        body: (
          <>
            <p>
              Type a protected area&apos;s name in the search box, for example
              Serengeti. Then use the switch on its row.
            </p>
            <p>
              For a concession, turn on a layer such as <b>{OIL_PALM_NAME}</b>{" "}
              in this panel. Zoom in and click a concession on the map.
            </p>
            <Tip>Concession layers cover some countries only.</Tip>
          </>
        ),
      },
    ],
  },
  "own-area": {
    label: "Draw or upload your own area",
    completion: "detected",
    steps: [
      {
        id: "own-area-tools",
        // The whole panel, not the two buttons: a search left in the box
        // hides them, and the spotlight would find nothing.
        target: anchorTarget(TOUR_ANCHORS.areasPanel),
        placement: "right",
        onEnter: openAreasPanel,
        title: "Add your own area",
        body: (
          <>
            <p>Use the buttons under the search box:</p>
            <ul>
              <li>
                <InlineIcon icon={SelectionPlusIcon} />{" "}
                <b>{AREA_ACTION_LABELS.draw}</b>: click the map to add points,
                then double-click to finish.
              </li>
              <li>
                <InlineIcon icon={UploadSimpleIcon} />{" "}
                <b>{AREA_ACTION_LABELS.upload}</b>: add a file with your
                boundary.
              </li>
            </ul>
            <Tip>No buttons? Clear the search box first.</Tip>
          </>
        ),
      },
    ],
  },
  compare: {
    label: "Compare two places",
    completion: "detected",
    steps: [
      {
        id: "compare-ask",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        onEnter: () => {
          closeExplorationPanels();
          prefillChatInput(COMPARE_PROMPT);
        },
        title: "Ask about two places at once",
        body: (
          <>
            <p>
              Name both places in one question. We have written one for you:
            </p>
            <Example>{COMPARE_PROMPT}</Example>
            <p>Change the places if you like. Then press send.</p>
            <Tip>
              Remove any area chips first, so Horizon uses only the places you
              type.
            </Tip>
            <DailyPromptsNote whenNoneLeft={NO_PROMPTS_LEFT} />
          </>
        ),
      },
    ],
  },
  "dashboard-pdf": {
    label: "Save a chart to a dashboard and get a PDF",
    completion: "manual",
    steps: [
      {
        id: "dashboard-create",
        target: anchorTarget(TOUR_ANCHORS.analysesButton),
        placement: "top",
        padding: 5,
        onEnter: closeExplorationPanels,
        title: "Make a dashboard for an area",
        body: (
          <>
            <p>
              Choose an area with a dataset on the map. In the chat, click{" "}
              <b>{createDashboardNudgeLabel("…")}</b>
            </p>
            <p>
              Then click <b>{ADD_TO_DASHBOARD_LABEL}</b> on a chart.{" "}
              <InlineIcon icon={ChartLineIcon} /> <b>{ANALYSES_LABEL}</b> lists
              all your charts.
            </p>
            <Tip>
              On the dashboard, you can also ask for a satellite imagery map of
              the area.
            </Tip>
          </>
        ),
      },
      {
        id: "dashboard-pdf",
        title: "Get a PDF",
        body: (
          <p>
            Open your dashboard. Click <InlineIcon icon={FilePdfIcon} />{" "}
            <b>{DASHBOARD_EXPORT_LABEL}</b> at the top, then{" "}
            <InlineIcon icon={PrinterIcon} /> <b>{SAVE_AS_PDF_LABEL}</b>. Then
            come back and press <b>{MANUAL_TICK_LABEL}</b>.
          </p>
        ),
      },
    ],
  },
  "satellite-imagery": {
    label: "See satellite imagery of a place",
    completion: "detected",
    steps: [
      {
        id: "imagery-ask",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        // Imagery draws below dataset layers, which would cover it.
        onEnter: () => {
          closeExplorationPanels();
          clearDatasetLayers();
          prefillChatInput(IMAGERY_PROMPT);
        },
        title: "Ask for satellite imagery",
        body: (
          <>
            <p>
              We have taken the datasets off the map, so you can see the
              imagery. Send this question, or change the place:
            </p>
            <Example>{IMAGERY_PROMPT}</Example>
            <Tip>
              Sentinel-2 imagery covers most places. In the Amazon, you can also
              ask the {AI_ASSISTANT_LABEL} for Planet imagery: monthly images
              back to September 2020.
            </Tip>
            <DailyPromptsNote whenNoneLeft={NO_PROMPTS_LEFT} />
          </>
        ),
      },
    ],
  },
};

/** The checklist's items, in `CHECKLIST_ITEM_IDS` order. */
export const CHECKLIST_ITEMS: readonly ChecklistItem[] = CHECKLIST_ITEM_IDS.map(
  (id) => ({ id, ...ITEMS[id] })
);

/**
 * A task's guide. It shows where the task starts and leaves the panels it
 * opened open, for the user to carry on. Finishing it ticks nothing: the
 * checklist watcher ticks a task when the app shows it was done. Only a
 * `manual` task offers a button that ticks it.
 */
export function createChecklistTour(item: ChecklistItem): UiTour {
  const last = item.steps.length - 1;
  const markDone = (end: (completed: boolean) => void) => {
    useOnboardingStore.getState().markChecklistDone([item.id], "manual");
    end(true);
  };
  return {
    id: `checklist-${item.id}`,
    version: CHECKLIST_TOURS_VERSION,
    steps: item.steps.map((s, i) =>
      i === last
        ? {
            ...s,
            ctaLabel: s.ctaLabel ?? GUIDE_DONE_LABEL,
            ...(item.completion === "manual" && {
              secondary: { label: MANUAL_TICK_LABEL, onClick: markDone },
            }),
          }
        : s
    ),
  };
}
