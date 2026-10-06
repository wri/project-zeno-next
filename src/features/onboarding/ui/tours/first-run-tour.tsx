"use client";

import {
  BirdIcon,
  ChartBarIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  InfoIcon,
  ListIcon,
  MapTrifoldIcon,
  PolygonIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StackSimpleIcon,
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
import { TCL_DATASET_ID } from "@/app/utils/defaultMapLayers";
import {
  GADM_BOUNDARY_LAYER,
  KENYA_BOUNDS,
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
  restoreMapDefaults,
  sentMessageSince,
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

/** The chat half's question: same dataset, new area, plus a context layer and dates. */
const CHAT_DEMO_PROMPT =
  "How much primary forest was lost in Brazil between 2015 and 2024?";

const BOUNDARY_TYPES = (
  <ul>
    <li>
      <InlineIcon icon={MapTrifoldIcon} /> <b>Administrative areas</b>:
      countries, states, districts
    </li>
    <li>
      <InlineIcon icon={BirdIcon} /> <b>Key Biodiversity Areas</b>
    </li>
    <li>
      <InlineIcon icon={ShieldCheckIcon} /> <b>Protected areas</b>
    </li>
    <li>
      <InlineIcon icon={UsersThreeIcon} /> <b>Indigenous lands</b>
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
  let collapseChecklistOnFinish = false;

  const finish = (outcome: TourOutcome) => {
    const store = useOnboardingStore.getState();
    store.recordTourOutcome(
      outcome,
      outcome === "completed" ? ITEMS_COVERED_BY_FIRST_RUN_TOUR : []
    );
    store.setChecklistExpanded(
      outcome === "completed" && !collapseChecklistOnFinish
    );
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
        onEnter: clearMap,
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
        title: "Open the Data catalog",
        body: (
          <p>
            Click <InlineIcon icon={StackSimpleIcon} /> <b>Datasets</b> in the
            chat box. It lists every dataset Horizon can show on the map.
          </p>
        ),
        waitFor: isDataCatalogOpen,
        hint: "Click Datasets",
      },
      {
        id: "turn-on-tcl",
        target: anchorTarget(catalogCardAnchor(TCL_DATASET_ID)),
        placement: "right",
        eyebrow: "Step 1 of 3 · Dataset",
        title: "Turn on Tree cover loss",
        body: (
          <p>
            Turn on <b>Show on map</b>. Pink pixels show where trees were lost
            each year since 2001. The <InlineIcon icon={InfoIcon} /> button
            explains each dataset&apos;s coverage and caveats.
          </p>
        ),
        waitFor: isDatasetOnMap(TCL_DATASET_ID),
        hint: "Toggle Show on map",
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
            Click <InlineIcon icon={PolygonIcon} /> <b>Areas</b>.
          </p>
        ),
        waitFor: isAreasPanelOpen,
        hint: "Click Areas",
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
              Turn on <b>Show on map</b> for <b>Administrative areas</b>.
            </p>
          </>
        ),
        waitFor: isBoundaryLayerShown(GADM_BOUNDARY_LAYER),
        hint: "Toggle Administrative areas",
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
              You have a dataset and an area selected, so Horizon offers to
              analyse them. Click <b>View analysis</b>.
            </p>
            <Tip>
              You can also run it from the{" "}
              <InlineIcon icon={DotsThreeVerticalIcon} /> menu on the
              area&apos;s label on the map.
            </Tip>
          </>
        ),
        waitFor: hasAcceptedViewAnalysis,
        hint: "Click View analysis",
        skippable: true,
      },
      {
        id: "insight",
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Step 3 of 3 · Analysis",
        title: "Here's your analysis",
        noBack: true,
        optional: true,
        // The insight appears once the analysis job finishes.
        targetTimeoutMs: 20000,
        body: (
          <>
            <p>The chart opens on the map, next to the data it describes.</p>
            <ul>
              <li>
                <InlineIcon icon={ChartBarIcon} /> <b>Chart</b> /{" "}
                <InlineIcon icon={TableIcon} /> <b>Table</b> switch views, or
                open it <b>Full-screen</b>
              </li>
              <li>
                <InlineIcon icon={DownloadSimpleIcon} /> <b>Download</b> the
                data or the chart
              </li>
              <li>
                <b>Show params</b> lists the settings it used; <b>Learn more</b>{" "}
                explains how this kind of analysis is made
              </li>
            </ul>
            <Tip>
              Every analysis is kept under <b>Analyses</b> in the chat box,
              where you can also add it to a dashboard.
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
          chatBaseline = chatMessageCount();
          insightBaseline = insightCount();
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
        body: (
          <p>
            The area Horizon chose, also outlined on the map. Check it&apos;s
            the place you meant. Its menu lets you save or remove it.
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
        body: (
          <p>
            Same controls as the analysis you ran by hand. Horizon is still
            writing up the answer, which will appear in the chat with a card for
            this chart.
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
        id: "menu",
        target: anchorTarget(TOUR_ANCHORS.menuButton),
        placement: "bottom",
        eyebrow: "Find out more",
        title: "Help and more live in the menu",
        optional: true,
        body: (
          <>
            <p>
              Open <InlineIcon icon={ListIcon} /> the menu for <b>Help</b>,
              which opens the Horizon Help Center. Look there for:
            </p>
            <ul>
              <li>
                <b>Capabilities</b>: what Horizon can and can&apos;t answer,
                with example questions
              </li>
              <li>
                <b>Datasets</b>: sources, coverage, resolution and caveats
              </li>
              <li>
                <b>Known issues</b>: current limitations and workarounds
              </li>
            </ul>
            <Tip>
              The menu also has <b>My areas</b>, <b>What&apos;s new</b> and your
              daily prompt allowance.
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
