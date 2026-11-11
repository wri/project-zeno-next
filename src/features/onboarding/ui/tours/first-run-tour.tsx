"use client";

import { Link } from "@chakra-ui/react";
import {
  ChartBarIcon,
  ChartLineIcon,
  DownloadSimpleIcon,
  InfoIcon,
  MicroscopeIcon,
  PolygonIcon,
  SparkleIcon,
  StackSimpleIcon,
  TableIcon,
  ThumbsDownIcon,
} from "@phosphor-icons/react";

import {
  FIRST_RUN_TOUR_VERSION,
  type TourOutcome,
} from "../../model/onboarding-progress";
import useOnboardingStore from "../../model/onboarding-store";
import { SHOW_RESULT_MS } from "../../model/step-policy";
import { AI_ASSISTANT_LABEL } from "@/app/ChatPanelHeader";
import { analyseNudgeLabel } from "@/app/components/AnalyseNudge";
import { AREA_ACTION_LABELS } from "@/app/components/AreaActionBar";
import { DATA_CATALOG_LABEL } from "@/app/components/CatalogPanel";
import { ChatContextOptions } from "@/app/components/ContextButton";
import { INSIGHT_CAPTION_LABELS } from "@/app/components/InsightCaption";
import { WIDGET_CONTROL_LABELS } from "@/app/components/WidgetMessage";
import { SHOW_PARAMS_LABEL } from "@/app/components/widgets/AnalysisParameters";
import {
  DOWNLOAD_ITEM_LABELS,
  DOWNLOAD_LABEL,
} from "@/app/components/widgets/DownloadMenu";
import {
  DATASET_CARD_BY_ID,
  TREE_COVER_LOSS_DATASET_ID,
} from "@/app/constants/datasets";
import { PREVIEW_FEEDBACK_FORM } from "@/app/constants/preview-content";
import { viewAnalysisNudgeLabel } from "@/src/features/analysis";
import {
  answerFailedSince,
  answeredCount,
  chatMessageCount,
  chatSettledSince,
  clearAreasAndCharts,
  clearMap,
  closeExplorationPanels,
  handRunChartFailed,
  hasAcceptedViewAnalysis,
  hasSelectedArea,
  insightCount,
  isDataCatalogOpen,
  isDatasetOnMap,
  leadChartShowsWorking,
  openAreasPanel,
  openDataCatalog,
  restoreMapDefaults,
  sentMessageSince,
  showDatasetOnMap,
  useAppValue,
} from "../app-actions";
import { TOUR_ANCHORS, catalogCardAnchor } from "@/src/shared/lib/tour-anchors";
import {
  DailyPromptsNote,
  Example,
  Ingredients,
  InlineIcon,
  SummaryPair,
  Tip,
} from "../tour-content";
import { FIRST_RUN_TOUR_ID, TAKE_THE_TOUR_LABEL } from "../tour-entry";
import { anchorTarget } from "../../model/tour";
import type { UiTour } from "../types";

// UI labels come from the components that render them, so a rename reaches
// the copy too (checked by tests/architecture/tour-contract.test.ts).
const DATASETS_LABEL = ChatContextOptions.layer.label;
const AREAS_LABEL = ChatContextOptions.area.label;
const TCL_CARD = DATASET_CARD_BY_ID[TREE_COVER_LOSS_DATASET_ID];
const TCL_NAME = TCL_CARD.dataset_name;
const VIEW_NUDGE = viewAnalysisNudgeLabel(TCL_NAME, "…");
const GENERATE_NUDGE = analyseNudgeLabel(TCL_NAME, "…");

/**
 * The step count the welcome states. `tours.test.ts` checks it against the
 * steps, so the welcome can't drift from the tour's real length.
 */
export const FIRST_RUN_STEP_COUNT = 10;

/**
 * How long the welcome says the tour takes, including the wait for the
 * chat answer.
 */
const TOUR_LENGTH = "about 4 minutes";

/**
 * What the answer step says about the wait. From a reviewer's runs on
 * staging (45 to 60 s), not from the code: one place to change it after a
 * timing.
 */
export const ANSWER_WAIT_COPY = "This can take about a minute.";

/** The chat half's question. The user is invited to change the place. */
export const CHAT_DEMO_PROMPT =
  "How much tree cover was lost in Kenya between 2015 and 2024?";

const NO_PROMPTS_IN_TOUR =
  "You have used all your daily prompts. They refresh every 24 hours. Press Skip step.";

/**
 * The answer step's body: what to check once the answer is in, or what went
 * wrong when it failed. Re-renders as the answer streams.
 */
function AnswerStepBody({ failed }: { failed: () => boolean }) {
  if (useAppValue(failed))
    return (
      <>
        <p>
          Horizon could not finish this answer. The chat shows what went wrong.
        </p>
        <p>
          Try the question again after the tour, or ask it in a different way.
        </p>
      </>
    );
  return (
    <>
      <p>
        {ANSWER_WAIT_COPY} The steps Horizon takes show here while it works.
        When the answer is ready, scroll the chat and check it:
      </p>
      <ul>
        <li>The area card: is it the place you meant?</li>
        <li>The dataset card: is it the data you wanted?</li>
        <li>
          The written answer: what does the data measure, and what does it not
          measure?
        </li>
      </ul>
      <Tip>
        Check the sources and the limits of the data before you share a number.
      </Tip>
    </>
  );
}

/**
 * The answer's chart, and how to check it. Show working exists only on a
 * chart made with code the AI wrote; a curated answer gets no such advice.
 */
function AiChartStepBody() {
  const showsWorking = useAppValue(leadChartShowsWorking);
  return (
    <>
      <p>Look at the label at the top of the chart:</p>
      <ul>
        <li>
          <b>{INSIGHT_CAPTION_LABELS.aiAssisted}</b>: the {AI_ASSISTANT_LABEL}{" "}
          made the chart from your question. AI can make mistakes.
        </li>
        <li>
          <b>{INSIGHT_CAPTION_LABELS.curated}</b>: the chart comes straight from
          the source data, like the chart you made manually.
        </li>
      </ul>
      {showsWorking ? (
        <p>
          On an <b>{INSIGHT_CAPTION_LABELS.aiAssisted}</b> chart, click{" "}
          <InlineIcon icon={MicroscopeIcon} />{" "}
          <b>{WIDGET_CONTROL_LABELS.showWorking}</b> to see how it was made.{" "}
          <b>{SHOW_PARAMS_LABEL}</b> shows the area, dataset and years it used.
        </p>
      ) : (
        <p>
          This answer&apos;s chart is <b>{INSIGHT_CAPTION_LABELS.curated}</b>,
          like the chart you made manually. <b>{SHOW_PARAMS_LABEL}</b> shows the
          area, dataset and years it used.
        </p>
      )}
      <Tip>
        If there is more than one chart, use the arrows at the bottom of the
        card.
      </Tip>
    </>
  );
}

/**
 * One chart made manually (dataset → area → View analysis), then the same
 * kind of question asked in the chat, how to check the answer, and a
 * hand-off to the checklist of tasks to try alone.
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
  // has pressed "Start the tour": someone who backs out keeps theirs.
  const clearMapOnce = () => {
    if (mapCleared) return;
    clearMap();
    mapCleared = true;
  };

  // The chat half's steps only make sense for a question that was sent and
  // answered. Skipping the question (e.g. no prompts left today) passes them
  // over; a failed answer is explained in the answer step.
  const noQuestion = () => !sentMessageSince(chatBaseline);
  const answerFailed = () => answerFailedSince(chatBaseline, answerBaseline);
  const noAnswer = () => noQuestion() || answerFailed();

  // Finishing ticks nothing: the checklist's tasks are ones the tour doesn't
  // teach, and a finished tour may have had a failed answer.
  const finish = (outcome: TourOutcome) => {
    const store = useOnboardingStore.getState();
    store.recordTourOutcome(outcome);
    store.setChecklistExpanded(
      outcome === "completed" && !collapseChecklistOnFinish
    );
    if (!mapCleared) return;
    closeExplorationPanels();
    restoreMapDefaults();
  };

  return {
    id: FIRST_RUN_TOUR_ID,
    version: FIRST_RUN_TOUR_VERSION,
    onEnd: (completed) => finish(completed ? "completed" : "skipped"),
    steps: [
      {
        id: "welcome",
        eyebrow: `Welcome · ${FIRST_RUN_STEP_COUNT} steps, ${TOUR_LENGTH}`,
        title: "Welcome to Global Nature Watch Horizon",
        body: (
          <>
            <p>
              Horizon answers your questions about nature with data, charts and
              maps. A good question has three parts:
            </p>
            <Ingredients />
            <p>
              First, you make a chart manually: you choose a dataset and an
              area, then show the chart. Then you ask the {AI_ASSISTANT_LABEL} a
              question in the chat.
            </p>
            <Tip>
              To take the tour later, open the menu and choose{" "}
              <b>{TAKE_THE_TOUR_LABEL}</b>.
            </Tip>
          </>
        ),
        ctaLabel: "Start the tour",
        secondary: { label: "Skip tour", onClick: (end) => end(false) },
      },
      {
        id: "open-catalog",
        target: anchorTarget(TOUR_ANCHORS.datasetsButton),
        placement: "top",
        padding: 5,
        eyebrow: "Dataset",
        title: `Open the ${DATA_CATALOG_LABEL}`,
        onEnter: clearMapOnce,
        body: (
          <p>
            Click <InlineIcon icon={StackSimpleIcon} /> <b>{DATASETS_LABEL}</b>{" "}
            in the chat box. The <b>{DATA_CATALOG_LABEL}</b> lists all the
            datasets you can show on the map.
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
        eyebrow: "Dataset",
        title: `Turn on ${TCL_NAME}`,
        body: (
          <>
            <p>
              Use the switch on the <b>{TCL_NAME}</b> row. Pink areas on the map
              show where tree cover was lost each year since{" "}
              {TCL_CARD.defaultStartYear}. Tree cover includes plantations, not
              only natural forest.
            </p>
            <Tip>
              The <InlineIcon icon={InfoIcon} /> button on each row gives more
              information about that dataset.
            </Tip>
          </>
        ),
        waitFor: isDatasetOnMap(TREE_COVER_LOSS_DATASET_ID),
        advanceDelayMs: SHOW_RESULT_MS,
        hint: `Turn on ${TCL_NAME}`,
        onSkip: () => showDatasetOnMap(TREE_COVER_LOSS_DATASET_ID),
      },
      {
        id: "find-area",
        // The whole panel: the search box and its results both need clicks.
        target: anchorTarget(TOUR_ANCHORS.areasPanel),
        placement: "right",
        eyebrow: "Area",
        title: "Now choose an area",
        // Datasets taught the button; here the tour opens the panel itself.
        onEnter: openAreasPanel,
        body: (
          <>
            <p>
              <InlineIcon icon={PolygonIcon} /> <b>{AREAS_LABEL}</b> in the chat
              box opens this panel. Type <b>Kenya</b> in the search box at the
              top. Then use the switch on the Kenya row.
            </p>
            <Tip>
              You can also show boundaries, such as protected areas, and click
              an area on the map. Or add your own area with{" "}
              <b>{AREA_ACTION_LABELS.draw}</b> or{" "}
              <b>{AREA_ACTION_LABELS.upload}</b>.
            </Tip>
          </>
        ),
        waitFor: hasSelectedArea,
        advanceDelayMs: SHOW_RESULT_MS,
        hint: "Search for Kenya",
      },
      {
        id: "view-analysis",
        target: anchorTarget(TOUR_ANCHORS.viewAnalysisNudge),
        placement: "right",
        padding: 5,
        eyebrow: "Your chart",
        title: "Show the chart",
        onEnter: closeExplorationPanels,
        body: (
          <>
            <p>
              Your dataset and area now show as chips above the chat box. In the
              chat, click <InlineIcon icon={ChartLineIcon} />{" "}
              <b>{VIEW_NUDGE}</b>
            </p>
            <Tip>
              This button does not use any of your daily prompts.{" "}
              <b>{GENERATE_NUDGE}</b> asks the {AI_ASSISTANT_LABEL} instead, and
              uses one prompt.
            </Tip>
          </>
        ),
        waitFor: hasAcceptedViewAnalysis,
        hint: `Click ${VIEW_NUDGE}`,
        // No area (the search skipped): nothing is offered to analyse.
        skipIf: () => !hasSelectedArea(),
      },
      {
        id: "insight",
        // The skeleton carries the same anchor, so the spotlight is on the
        // chart's place while it loads.
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Your chart",
        title: "The chart is on the map",
        noBack: true,
        // Next once the chart is in, not while it loads. A failed analysis
        // shows no chart, so the step is passed over.
        waitFor: () => insightCount() > 0,
        waitsOnApp: true,
        autoAdvance: false,
        hint: "Making your chart…",
        skipIf: () => !hasAcceptedViewAnalysis() || handRunChartFailed(),
        body: (
          <>
            <p>
              The chart opens on the map. The label at the top says{" "}
              <b>{INSIGHT_CAPTION_LABELS.curated}</b>. This means the chart
              comes straight from the source data, with no AI.
            </p>
            <ul>
              <li>
                <InlineIcon icon={ChartBarIcon} />{" "}
                <b>{WIDGET_CONTROL_LABELS.chart}</b> and{" "}
                <InlineIcon icon={TableIcon} />{" "}
                <b>{WIDGET_CONTROL_LABELS.table}</b> change the view.{" "}
                <b>{WIDGET_CONTROL_LABELS.fullScreen}</b> makes it bigger.
              </li>
              <li>
                <InlineIcon icon={DownloadSimpleIcon} /> <b>{DOWNLOAD_LABEL}</b>{" "}
                gives you <b>{DOWNLOAD_ITEM_LABELS.csv}</b> or{" "}
                <b>{DOWNLOAD_ITEM_LABELS.image}</b>.
              </li>
              <li>
                <b>{SHOW_PARAMS_LABEL}</b> shows the area, dataset and years the
                chart uses.
              </li>
            </ul>
            <Tip>
              If there is more than one chart, use the arrows at the bottom of
              the card.
            </Tip>
          </>
        ),
      },
      {
        id: "ask-in-chat",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        eyebrow: `Ask the ${AI_ASSISTANT_LABEL}`,
        title: "Now ask in your own words",
        noBack: true,
        onEnter: () => {
          clearAreasAndCharts();
          mapCleared = true;
          chatBaseline = chatMessageCount();
          insightBaseline = insightCount();
          answerBaseline = answeredCount();
          useOnboardingStore.getState().setDraftPrompt(CHAT_DEMO_PROMPT);
        },
        body: (
          <>
            <p>
              You can also ask in the chat. We have written a question for you:
            </p>
            <Example>{CHAT_DEMO_PROMPT}</Example>
            <p>Change Kenya to a place you care about. Then press send.</p>
            <Tip>
              The chips above the box go with your question. There is no area
              chip now, so Horizon uses the place you type. Remove a chip with ×
              to leave it out.
            </Tip>
            <DailyPromptsNote whenNoneLeft={NO_PROMPTS_IN_TOUR} />
          </>
        ),
        waitFor: () => sentMessageSince(chatBaseline),
        hint: "Press send",
      },
      {
        id: "answer",
        // The whole panel: the answer is often taller than the screen.
        target: anchorTarget(TOUR_ANCHORS.chatPanel),
        placement: "right",
        padding: 4,
        eyebrow: `Ask the ${AI_ASSISTANT_LABEL}`,
        title: "Your answer",
        noBack: true,
        // Next once the answer is done (or has failed), not while it streams.
        waitFor: () => chatSettledSince(chatBaseline),
        waitsOnApp: true,
        autoAdvance: false,
        hint: "Horizon is working…",
        skipIf: noQuestion,
        body: <AnswerStepBody failed={answerFailed} />,
      },
      {
        id: "ai-chart",
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Your answer",
        title: "Check how the chart was made",
        // Optional because the copy only makes sense with the chart card on
        // screen: if the card doesn't show, the step is passed over rather
        // than describing a card the user can't see.
        optional: true,
        // No answer, or an answer without a chart: nothing to check here.
        skipIf: () => noAnswer() || insightCount() <= insightBaseline,
        body: <AiChartStepBody />,
      },
      {
        id: "done",
        eyebrow: "Done",
        title: "You are ready to start",
        noBack: true,
        body: (
          <>
            <p>You know two ways to get a chart:</p>
            <SummaryPair
              items={[
                {
                  title: (
                    <>
                      <StackSimpleIcon /> Manually
                    </>
                  ),
                  text: `${DATASETS_LABEL} → ${AREAS_LABEL} → ${viewAnalysisNudgeLabel("…", "…")}`,
                },
                {
                  title: (
                    <>
                      <SparkleIcon /> In the chat
                    </>
                  ),
                  text: "Ask with an area, a dataset and a time range",
                },
              ]}
            />
            <p>
              The chips above the chat box carry into your next question. Remove
              them with × to start fresh.
            </p>
            <p>
              Next, try the checklist. It has six short tasks that you do
              yourself: alerts, protected areas and concessions, your own areas,
              comparing places, dashboards and PDFs, and satellite imagery.
            </p>
            <Tip>
              Something not working? Rate the answer with{" "}
              <InlineIcon icon={ThumbsDownIcon} />, or{" "}
              <Link
                href={PREVIEW_FEEDBACK_FORM}
                target="_blank"
                rel="noopener noreferrer"
                color="fg.link"
                textDecoration="underline"
              >
                send us a request
              </Link>
              . To see this tour again, open the menu and choose{" "}
              <b>{TAKE_THE_TOUR_LABEL}</b>.
            </Tip>
          </>
        ),
        ctaLabel: "Open the checklist",
        secondary: {
          label: "Close",
          onClick: (end) => {
            collapseChecklistOnFinish = true;
            end(true);
          },
        },
      },
    ],
  };
}
