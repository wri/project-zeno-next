"use client";

import {
  ArrowBendRightUpIcon,
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
import { BOUNDARIES_TAB_LABEL } from "@/app/components/AreasPanel";
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
  openDashboardNudgeLabel,
} from "@/src/features/dashboards";
import {
  clearDatasetLayers,
  closeExplorationPanels,
  openAreasPanel,
  openDataCatalog,
  prefillChatInput,
  promptsExhausted,
} from "../app-actions";
import { TOUR_ANCHORS, catalogCardAnchor } from "@/src/shared/lib/tour-anchors";
import {
  DailyPromptsNote,
  Example,
  InlineIcon,
  NO_PROMPTS_TODAY,
  Tip,
} from "../tour-content";
import { CHECKLIST_NAME } from "../tour-entry";
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
export const GUIDE_DONE_LABEL = "OK";

/** The button that ticks a task the app can't see being done. */
export const MANUAL_TICK_LABEL = "I have done this";

const COMPARE_PROMPT =
  "Compare tree cover loss in Kenya and Tanzania between 2015 and 2024.";
const IMAGERY_PROMPT = "Show recent satellite imagery of the Mau Forest";

/** The chat input's send button, as the copy shows it. */
const SEND_ICON = <InlineIcon icon={ArrowBendRightUpIcon} weight="bold" />;

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
        title: "Check recent alerts",
        body: (
          <>
            <p>
              {ALERTS_NAME} show recent signs of disturbance to forests and
              other vegetation. They are updated daily.
            </p>
            <p>
              We removed the other datasets from the map. Click the switch on
              this row. Then choose an area. In the chat, click{" "}
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
        title: "Choose a protected area or concession",
        body: (
          <>
            <p>
              Type a protected area&apos;s name in the search box, for example{" "}
              <b>Serengeti</b>. Then click the switch on its row.
            </p>
            <p>
              A concession is land that a company has the right to use, for
              example for oil palm. To find one, clear the search box. On the{" "}
              <b>{BOUNDARIES_TAB_LABEL}</b> tab, turn on <b>{OIL_PALM_NAME}</b>.
              Zoom in on the map. Click a concession.
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
        title: "Draw or upload your own area",
        body: (
          <>
            <p>Click a button under the search box:</p>
            <ul>
              <li>
                <InlineIcon icon={SelectionPlusIcon} />{" "}
                <b>{AREA_ACTION_LABELS.draw}</b>: click the map to add points.
                Double-click to finish.
              </li>
              <li>
                <InlineIcon icon={UploadSimpleIcon} />{" "}
                <b>{AREA_ACTION_LABELS.upload}</b>: add a file that contains
                your area.
              </li>
            </ul>
            <Tip>If you cannot see the buttons, clear the search box.</Tip>
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
        title: "Compare two places",
        body: (
          <>
            <p>
              Name both places in one question. We have written one for you:
            </p>
            <Example>{COMPARE_PROMPT}</Example>
            <p>
              Change the places if you like. Click the × on any area chip, so
              that the {AI_ASSISTANT_LABEL} uses only the places you type. Then
              click {SEND_ICON} to send the question.
            </p>
            <DailyPromptsNote whenNoneLeft={NO_PROMPTS_TODAY} />
          </>
        ),
        // The status says when the task can be done instead.
        blockedIf: promptsExhausted,
      },
    ],
  },
  "dashboard-pdf": {
    label: "Create a dashboard and save it as a PDF",
    completion: "manual",
    // Leaving the map ends a guide, so each step says all there is to do
    // before the user goes to the dashboard and the report.
    steps: [
      {
        id: "dashboard-create",
        // The chat, where the create button and then the dashboard card show.
        target: anchorTarget(TOUR_ANCHORS.chatPanel),
        placement: "right",
        padding: 4,
        onEnter: closeExplorationPanels,
        title: "Create a dashboard",
        body: (
          <>
            <p>A dashboard is a page with charts for one area.</p>
            <p>
              Choose an area with a dataset on the map. In the chat, click{" "}
              <b>{createDashboardNudgeLabel("…")}</b>
            </p>
            <p>
              This button creates the dashboard and adds your first chart to it.
              A dashboard card then shows in the chat.
            </p>
            <Tip>
              If the area already has a dashboard, the button says{" "}
              <b>{openDashboardNudgeLabel("…")}</b>.
            </Tip>
          </>
        ),
      },
      {
        id: "dashboard-pdf",
        // The dashboard page's chat box has the same Analyses button.
        target: anchorTarget(TOUR_ANCHORS.analysesButton),
        placement: "top",
        padding: 5,
        title: "Save the dashboard as a PDF",
        body: (
          <>
            <p>Click the dashboard card in the chat. The dashboard opens.</p>
            <ul>
              <li>
                To add more charts, click <b>{ADD_TO_DASHBOARD_LABEL}</b> on a
                chart in the chat, or in <InlineIcon icon={ChartLineIcon} />{" "}
                <b>{ANALYSES_LABEL}</b>.
              </li>
              <li>
                Click <InlineIcon icon={FilePdfIcon} />{" "}
                <b>{DASHBOARD_EXPORT_LABEL}</b> at the top. The report opens in
                a new tab.
              </li>
              <li>
                Click <InlineIcon icon={PrinterIcon} />{" "}
                <b>{SAVE_AS_PDF_LABEL}</b>. In the print window that opens, save
                the report as a PDF.
              </li>
            </ul>
            <p>
              Then return to the map. In <b>{CHECKLIST_NAME}</b>, click this
              task again. On this step, click <b>{MANUAL_TICK_LABEL}</b>.
            </p>
          </>
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
        title: "See satellite imagery",
        body: (
          <>
            <p>
              We removed the datasets from the map, so that you can see the
              imagery. Change the place in this question if you like:
            </p>
            <Example>{IMAGERY_PROMPT}</Example>
            <p>Then click {SEND_ICON} to send the question.</p>
            <Tip>
              Sentinel-2 imagery covers most of the world. In the Amazon, you
              can also ask for Planet imagery near recent alerts: monthly images
              from September 2020.
            </Tip>
            <DailyPromptsNote whenNoneLeft={NO_PROMPTS_TODAY} />
          </>
        ),
        blockedIf: promptsExhausted,
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
