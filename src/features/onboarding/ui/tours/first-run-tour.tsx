"use client";

import {
  BirdIcon,
  ChartBarIcon,
  ChartLineIcon,
  CrosshairIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  InfoIcon,
  ListIcon,
  MapTrifoldIcon,
  MicroscopeIcon,
  PolygonIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StackSimpleIcon,
  TreePalmIcon,
  TableIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

import {
  ITEMS_COVERED_BY_FIRST_RUN_TOUR,
  type TourOutcome,
} from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import { DATA_CATALOG_LABEL } from "@/app/components/CatalogPanel";
import { ChatContextOptions } from "@/app/components/ContextButton";
import { WIDGET_CONTROL_LABELS } from "@/app/components/WidgetMessage";
import { ANALYSES_LABEL } from "@/app/components/chatInputLabels";
import { VIEW_ANALYSIS_MENU_LABEL } from "@/app/components/map/aoiActionsMenuLabels";
import { SHOW_PARAMS_LABEL } from "@/app/components/widgets/AnalysisParameters";
import { DOWNLOAD_LABEL } from "@/app/components/widgets/DownloadMenu";
import {
  DATASET_CARD_BY_ID,
  TREE_COVER_LOSS_DATASET_ID,
} from "@/app/constants/datasets";
import { viewAnalysisNudgeLabel } from "@/src/features/analysis";
import {
  GADM_BOUNDARY_LAYER,
  KENYA_BOUNDS,
  answerFailedSince,
  answeredCount,
  areaCardSince,
  chatMessageCount,
  chatSettledSince,
  clearMap,
  closeExplorationPanels,
  flyMapTo,
  hasAcceptedViewAnalysis,
  hasSelectedArea,
  insightCount,
  isAreasPanelOpen,
  isChatLoading,
  isBoundaryLayerShown,
  isDataCatalogOpen,
  isDatasetOnMap,
  isGeneratingInsight,
  openAreasPanel,
  openDataCatalog,
  restoreMapDefaults,
  sentMessageSince,
  showBoundaryLayer,
  showDatasetOnMap,
} from "../app-actions";
import {
  TOUR_ANCHORS,
  boundaryCardAnchor,
  catalogCardAnchor,
} from "@/src/shared/lib/tour-anchors";
import {
  Example,
  Ingredients,
  InlineIcon,
  SummaryPair,
  Tip,
} from "../tour-content";
import { anchorTarget } from "../../model/tour";
import type { UiTour } from "../types";

// UI labels come from the components that render them, so a rename reaches
// the copy too (checked by tests/architecture/tour-contract.test.ts).
const DATASETS_LABEL = ChatContextOptions.layer.label;
const AREAS_LABEL = ChatContextOptions.area.label;
const TCL_NAME = DATASET_CARD_BY_ID[TREE_COVER_LOSS_DATASET_ID].dataset_name;
const VIEW_ANALYSIS_NUDGE = viewAnalysisNudgeLabel(TCL_NAME, "Kenya");

/** The chat half's question: same dataset, new area, plus a context layer and dates. */
const CHAT_DEMO_PROMPT =
  "How much primary forest was lost in Brazil between 2015 and 2024?";

const BOUNDARY_TYPES = (
  <ul>
    <li>
      <InlineIcon icon={MapTrifoldIcon} /> <b>Administrative Areas</b>:
      countries, states, districts
    </li>
    <li>
      <InlineIcon icon={BirdIcon} /> <b>Key Biodiversity Areas</b>
    </li>
    <li>
      <InlineIcon icon={ShieldCheckIcon} /> <b>Protected Areas</b>
    </li>
    <li>
      <InlineIcon icon={UsersThreeIcon} /> <b>Indigenous Lands</b>
    </li>
    <li>
      <InlineIcon icon={TreePalmIcon} /> <b>Commodities</b>: logging, mining,
      oil palm and wood fibre concessions
    </li>
  </ul>
);

/**
 * Option D from the onboarding exploration: one analysis by hand (dataset →
 * area → View analysis), the same kind of analysis by chat, a walk through the
 * chat answer, then hand-off to the checklist.
 *
 * Built per run because the chat steps share a message-count baseline.
 */
export function createFirstRunTour(): UiTour {
  let chatBaseline = 0;
  let insightBaseline = 0;
  let answerBaseline = 0;
  let collapseChecklistOnFinish = false;
  let mapCleared = false;

  // The hands-on part starts from an empty map, cleared only once the user
  // has pressed "Let's go": someone who backs out of the welcome keeps theirs.
  const clearMapOnce = () => {
    if (mapCleared) return;
    clearMap();
    mapCleared = true;
  };

  // The chat half's steps only make sense for a question that was sent and
  // answered. Skipping the question (e.g. no prompts left today) or a failed
  // answer passes them over; a failed one gets its own step instead.
  const noQuestion = () => !sentMessageSince(chatBaseline);
  const answerFailed = () => answerFailedSince(chatBaseline, answerBaseline);
  const noAnswer = () => noQuestion() || answerFailed();

  const finish = (outcome: TourOutcome) => {
    const store = useOnboardingStore.getState();
    store.recordTourOutcome(
      outcome,
      outcome === "completed" ? ITEMS_COVERED_BY_FIRST_RUN_TOUR : []
    );
    store.setChecklistExpanded(
      outcome === "completed" && !collapseChecklistOnFinish
    );
    if (!mapCleared) return;
    closeExplorationPanels();
    restoreMapDefaults();
  };

  return {
    id: "first-run",
    onEnd: (completed) => finish(completed ? "completed" : "skipped"),
    steps: [
      {
        id: "welcome",
        eyebrow: "Welcome · about 2 minutes",
        title: "Welcome to Global Nature Watch Horizon",
        body: (
          <>
            <p>
              Ask a question in plain language and Horizon finds the data, runs
              the analysis and maps the answer. You&apos;ll get the best results
              when your question includes:
            </p>
            <Ingredients />
            <p>
              First, we&apos;ll do one analysis by hand so you know where
              everything is: <b>choose a dataset</b>, <b>pick an area</b>, then{" "}
              <b>run the analysis</b>. Then we&apos;ll show you how to do the
              same thing in one sentence.
            </p>
          </>
        ),
        ctaLabel: "Let's go",
        secondary: { label: "Skip tour", onClick: (end) => end(false) },
      },
      {
        id: "open-catalog",
        target: anchorTarget(TOUR_ANCHORS.datasetsButton),
        placement: "top",
        padding: 5,
        eyebrow: "Step 1 of 3 · Dataset",
        title: `Open the ${DATA_CATALOG_LABEL}`,
        onEnter: clearMapOnce,
        body: (
          <p>
            Click <InlineIcon icon={StackSimpleIcon} /> <b>{DATASETS_LABEL}</b>{" "}
            in the chat box. It lists every dataset Horizon can show on the map.
          </p>
        ),
        waitFor: isDataCatalogOpen,
        hint: `Click ${DATASETS_LABEL}`,
        onSkip: openDataCatalog,
      },
      {
        id: "turn-on-tcl",
        target: anchorTarget(catalogCardAnchor(TREE_COVER_LOSS_DATASET_ID)),
        placement: "right",
        eyebrow: "Step 1 of 3 · Dataset",
        title: `Turn on ${TCL_NAME}`,
        body: (
          <p>
            Flip the switch on the <b>{TCL_NAME}</b> row. Pink pixels show where
            trees were lost each year since 2001. The{" "}
            <InlineIcon icon={InfoIcon} /> button on a row explains that
            dataset&apos;s coverage and caveats.
          </p>
        ),
        waitFor: isDatasetOnMap(TREE_COVER_LOSS_DATASET_ID),
        hint: `Turn on ${TCL_NAME}`,
        onSkip: () => showDatasetOnMap(TREE_COVER_LOSS_DATASET_ID),
      },
      {
        id: "open-areas",
        target: anchorTarget(TOUR_ANCHORS.areasButton),
        placement: "top",
        padding: 5,
        eyebrow: "Step 2 of 3 · Area",
        title: "Now choose an area",
        body: (
          <p>
            Click <InlineIcon icon={PolygonIcon} /> <b>{AREAS_LABEL}</b>.
          </p>
        ),
        waitFor: isAreasPanelOpen,
        hint: `Click ${AREAS_LABEL}`,
        onSkip: openAreasPanel,
      },
      {
        id: "show-gadm",
        target: anchorTarget(boundaryCardAnchor(GADM_BOUNDARY_LAYER)),
        placement: "right",
        eyebrow: "Step 2 of 3 · Area",
        title: "Show a boundary layer",
        body: (
          <>
            <p>Each boundary layer outlines a different kind of area:</p>
            {BOUNDARY_TYPES}
            <p>
              Flip the switch on the <b>Administrative Areas</b> row.
            </p>
          </>
        ),
        waitFor: isBoundaryLayerShown(GADM_BOUNDARY_LAYER),
        hint: "Turn on Administrative Areas",
        onSkip: () => showBoundaryLayer(GADM_BOUNDARY_LAYER),
      },
      {
        id: "pick-kenya",
        target: { kind: "map", bounds: KENYA_BOUNDS },
        placement: "left",
        padding: 8,
        eyebrow: "Step 2 of 3 · Area",
        title: "Click Kenya on the map",
        onEnter: () => {
          closeExplorationPanels();
          flyMapTo(KENYA_BOUNDS);
        },
        body: (
          <>
            <p>
              Hover over the outlines to see names, then click <b>Kenya</b>.
            </p>
            <Tip>
              Any area works. Zoom in to pick a state or district instead.
            </Tip>
          </>
        ),
        waitFor: hasSelectedArea,
        hint: "Click Kenya",
      },
      {
        id: "view-analysis",
        target: anchorTarget(TOUR_ANCHORS.viewAnalysisNudge),
        placement: "right",
        padding: 5,
        eyebrow: "Step 3 of 3 · Analysis",
        title: "Run the analysis",
        body: (
          <>
            <p>
              Horizon now offers to analyse your dataset and area. In the chat,
              click <InlineIcon icon={ChartLineIcon} />{" "}
              <b>{VIEW_ANALYSIS_NUDGE}</b>.
            </p>
            <Tip>
              Ignore the other offers for now. <b>Generate … Insight</b> asks
              the agent for a written insight instead.
            </Tip>
            <Tip>
              You can also choose <b>{VIEW_ANALYSIS_MENU_LABEL}</b> from the{" "}
              <InlineIcon icon={DotsThreeVerticalIcon} /> menu on the
              area&apos;s label on the map.
            </Tip>
          </>
        ),
        waitFor: hasAcceptedViewAnalysis,
        hint: `Click ${VIEW_ANALYSIS_NUDGE}`,
        skippable: true,
        // No area (Kenya skipped): nothing is offered to analyse.
        skipIf: () => !hasSelectedArea(),
      },
      {
        id: "insight",
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Step 3 of 3 · Analysis",
        title: "Here's your analysis",
        noBack: true,
        optional: true,
        // The chart appears once the analysis job finishes: hold (no Next)
        // while it loads. A failed analysis shows none, so the step passes.
        holdWhile: isGeneratingInsight,
        skipIf: () => !hasAcceptedViewAnalysis(),
        body: (
          <>
            <p>The chart opens on the map, next to the data it describes.</p>
            <ul>
              <li>
                <InlineIcon icon={ChartBarIcon} />{" "}
                <b>{WIDGET_CONTROL_LABELS.chart}</b> /{" "}
                <InlineIcon icon={TableIcon} />{" "}
                <b>{WIDGET_CONTROL_LABELS.table}</b> switch views, or open it{" "}
                <b>{WIDGET_CONTROL_LABELS.fullScreen}</b>
              </li>
              <li>
                <InlineIcon icon={MicroscopeIcon} />{" "}
                <b>{WIDGET_CONTROL_LABELS.showWorking}</b> shows how the chart
                was made
              </li>
              <li>
                <InlineIcon icon={DownloadSimpleIcon} /> <b>{DOWNLOAD_LABEL}</b>{" "}
                the data or the chart
              </li>
              <li>
                <b>{SHOW_PARAMS_LABEL}</b> lists the settings it used
              </li>
            </ul>
            <Tip>
              Every analysis is kept under <b>{ANALYSES_LABEL}</b> in the chat
              box, where you can also add it to a dashboard.
            </Tip>
          </>
        ),
      },
      {
        id: "ask-in-chat",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        eyebrow: "The shortcut · Chat",
        title: "Now do it in one sentence",
        noBack: true,
        onEnter: () => {
          clearMap();
          mapCleared = true;
          chatBaseline = chatMessageCount();
          insightBaseline = insightCount();
          answerBaseline = answeredCount();
          useOnboardingStore.getState().setDraftPrompt(CHAT_DEMO_PROMPT);
        },
        body: (
          <>
            <p>
              You can get the same result, and be more specific, just by asking.
              We&apos;ve cleared the map and written a question for you:
            </p>
            <Example>{CHAT_DEMO_PROMPT}</Example>
            <ul>
              <li>
                <b>Primary forest</b> is a <i>context layer</i>. It limits tree
                cover loss to humid tropical primary forest.
              </li>
              <li>
                <b>Between 2015 and 2024</b> sets the time range. Tree cover
                loss data runs from 2001 to 2025.
              </li>
              <li>
                <b>Canopy threshold</b>: add “at 50% canopy cover” for a
                stricter definition of tree cover. The default is 30%.
              </li>
            </ul>
          </>
        ),
        waitFor: () => sentMessageSince(chatBaseline),
        hint: "Press send",
      },
      {
        id: "working",
        target: anchorTarget(TOUR_ANCHORS.reasoning),
        placement: "right",
        eyebrow: "The shortcut · Chat",
        title: "Horizon does the clicking for you",
        noBack: true,
        body: (
          <p>
            It reads your question and picks the area, dataset, context layer
            and dates, the same steps you just did by hand. We&apos;ll show you
            each part of the answer as it arrives.
          </p>
        ),
        // Move on as soon as the first card lands, not when the whole answer
        // is done (or if the answer ends without one).
        waitFor: () =>
          areaCardSince(chatBaseline) || chatSettledSince(chatBaseline),
        waitsOnApp: true,
        hint: "Horizon is working…",
        skipIf: noQuestion,
      },
      {
        id: "area-card",
        target: anchorTarget(TOUR_ANCHORS.chatAreaCard),
        placement: "right",
        padding: 4,
        eyebrow: "Reading the answer",
        title: "The area card",
        noBack: true,
        optional: true,
        holdWhile: isChatLoading,
        skipIf: noAnswer,
        body: (
          <p>
            The area Horizon chose, also outlined on the map. Check it&apos;s
            the place you meant. <InlineIcon icon={CrosshairIcon} /> centres the
            map on it.
          </p>
        ),
      },
      {
        id: "dataset-card",
        target: anchorTarget(TOUR_ANCHORS.chatDatasetCard),
        placement: "right",
        padding: 4,
        eyebrow: "Reading the answer",
        title: "The dataset card",
        optional: true,
        holdWhile: isChatLoading,
        skipIf: noAnswer,
        body: (
          <p>
            The dataset it used, with the context layer and date range. The{" "}
            <InlineIcon icon={InfoIcon} /> button shows coverage and caveats.
          </p>
        ),
      },
      {
        id: "generating",
        target: anchorTarget(TOUR_ANCHORS.reasoning),
        placement: "right",
        eyebrow: "Reading the answer",
        title: "Horizon is generating an analysis",
        body: (
          <p>
            This can take a few moments. The chart opens on the map as soon as
            it&apos;s ready.
          </p>
        ),
        waitFor: () =>
          // Charts reach the map's insight store before the chat card.
          insightCount() > insightBaseline || chatSettledSince(chatBaseline),
        waitsOnApp: true,
        hint: "Generating…",
        skipIf: noAnswer,
      },
      {
        id: "analysis-on-map",
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Reading the answer",
        title: "Your analysis is on the map",
        // Back would land on "generating", which skips straight here again.
        noBack: true,
        optional: true,
        skipIf: noAnswer,
        body: (
          <p>
            It has the same controls as the analysis you ran by hand, such as{" "}
            <b>{WIDGET_CONTROL_LABELS.showWorking}</b> and{" "}
            <b>{DOWNLOAD_LABEL}</b>. Horizon is still writing up the answer,
            which will appear in the chat with a card for this chart.
          </p>
        ),
      },
      {
        id: "analysis-card",
        target: anchorTarget(TOUR_ANCHORS.chatAnalysisCard),
        placement: "right",
        padding: 4,
        eyebrow: "Reading the answer",
        title: "The analysis card",
        optional: true,
        holdWhile: isChatLoading,
        skipIf: noAnswer,
        body: (
          <p>
            The chart Horizon made, which is open on the map now. Click this
            card to bring it back later. The strip below shows which dataset it
            came from.
          </p>
        ),
      },
      {
        id: "explanation",
        // The whole panel: the written answer is often taller than the screen.
        target: anchorTarget(TOUR_ANCHORS.chatPanel),
        placement: "right",
        padding: 4,
        eyebrow: "Reading the answer",
        title: "The explanation",
        optional: true,
        // The summary is the last thing written; offer Next once it's done.
        waitFor: () => chatSettledSince(chatBaseline),
        autoAdvance: false,
        waitsOnApp: true,
        hint: "Finishing the answer…",
        skipIf: noAnswer,
        body: (
          <>
            <p>
              The written answer is here in the chat: a plain-language summary,
              what the data does and doesn&apos;t measure, and ideas for
              follow-up questions. Scroll the chat to read all of it.
            </p>
            <Tip>
              Rate answers with <InlineIcon icon={ThumbsUpIcon} />{" "}
              <InlineIcon icon={ThumbsDownIcon} />. It helps us improve Horizon.
            </Tip>
            <Tip>
              Start a new conversation or reopen an earlier one with the buttons
              at the top of the chat.
            </Tip>
          </>
        ),
      },
      {
        id: "answer-failed",
        target: anchorTarget(TOUR_ANCHORS.chatPanel),
        placement: "right",
        padding: 4,
        eyebrow: "The shortcut · Chat",
        title: "Horizon couldn't finish this answer",
        noBack: true,
        // Only after a failed answer; a good one is read in the step before.
        skipIf: () => !answerFailed(),
        body: (
          <p>
            The chat shows what went wrong. Try the question again after the
            tour, or ask it in a different way.
          </p>
        ),
      },
      {
        id: "menu",
        target: anchorTarget(TOUR_ANCHORS.menuButton),
        placement: "bottom",
        eyebrow: "Find out more",
        title: "Help and more live in the menu",
        optional: true,
        body: (
          <>
            <p>
              After the tour, open <InlineIcon icon={ListIcon} /> the menu and
              choose <b>Help</b> to open the Horizon Help Center. Look there
              for:
            </p>
            <ul>
              <li>
                <b>Capabilities</b>: what Horizon can answer, and the datasets
                it uses
              </li>
              <li>
                <b>FAQs</b> and <b>Accuracy</b>: how to read the results
              </li>
              <li>
                <b>Known Issues</b>: current limitations
              </li>
            </ul>
            <Tip>
              The menu also has <b>Dashboards</b>, <b>My areas</b>,{" "}
              <b>What&apos;s new</b> and your daily prompt allowance.
            </Tip>
          </>
        ),
      },
      {
        id: "done",
        eyebrow: "Done",
        title: "That's the basics",
        noBack: true,
        body: (
          <>
            <p>You now know two ways to get an analysis:</p>
            <SummaryPair
              items={[
                {
                  title: (
                    <>
                      <StackSimpleIcon /> By hand
                    </>
                  ),
                  text: "Dataset → area → View analysis",
                },
                {
                  title: (
                    <>
                      <SparkleIcon /> By chat
                    </>
                  ),
                  text: "Ask with an area, a dataset and a time range",
                },
              ]}
            />
            <p>
              There&apos;s more to find: satellite imagery, drawing your own
              areas, dashboards. A short checklist walks you through each when
              you&apos;re ready.
            </p>
          </>
        ),
        ctaLabel: "Open the checklist",
        secondary: {
          label: "I'm done for now",
          onClick: (end) => {
            collapseChecklistOnFinish = true;
            end(true);
          },
        },
      },
    ],
  };
}
