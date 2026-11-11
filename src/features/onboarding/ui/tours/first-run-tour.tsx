"use client";

import { Link } from "@chakra-ui/react";
import {
  ArrowBendRightUpIcon,
  ChartBarIcon,
  ChartLineIcon,
  DownloadSimpleIcon,
  InfoIcon,
  ListIcon,
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
import { BOUNDARIES_TAB_LABEL } from "@/app/components/AreasPanel";
import { DATA_CATALOG_LABEL } from "@/app/components/CatalogPanel";
import { ChatContextOptions } from "@/app/components/ContextButton";
import { INSIGHT_CAPTION_LABELS } from "@/app/components/InsightCaption";
import { ANALYSIS_CARD_LABEL } from "@/app/components/InsightWorkspace";
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
import { ENTITY_KINDS } from "@/src/shared/ui/entity-card";
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
  lastTurnAsksToChoose,
  leadChartShowsWorking,
  openAreasPanel,
  openDataCatalog,
  prefillChatInput,
  promptsExhausted,
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
  NO_PROMPTS_TODAY,
  SummaryPair,
  Tip,
} from "../tour-content";
import { FIRST_RUN_TOUR_ID } from "../../model/tour-entry";
import { CHECKLIST_NAME, TAKE_THE_TOUR_LABEL } from "../tour-entry";
import { NEXT_LABEL } from "../TourPopover";
import { anchorTarget } from "../../model/tour";
import type { UiTour } from "../types";
import { CHECKLIST_ITEMS } from "./checklist-tours";

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
export const ANSWER_WAIT_COPY = "This can take about 1 minute.";

/** The chat half's question. The user is invited to change the place. */
export const CHAT_DEMO_PROMPT =
  "How much tree cover was lost in Kenya between 2015 and 2024?";

/** How to take the tour again: the same sentence at the welcome and the end. */
const TAKE_THE_TOUR_LATER = (
  <>
    To take the tour later, open the menu <InlineIcon icon={ListIcon} /> at the
    top left. Then click <b>{TAKE_THE_TOUR_LABEL}</b>.
  </>
);

/** What Show params lists, the same on the hand-run and the answer's chart. */
const SHOW_PARAMS_TEXT = (
  <>
    <b>{SHOW_PARAMS_LABEL}</b> shows the area, dataset, years and, for some
    datasets, the canopy threshold.
  </>
);

const MORE_CHARTS_TIP =
  "If there is more than one chart, click the arrows under the chart.";

/**
 * What the chat step says it took off the map: only what was there (a user
 * who skipped the area search had nothing to remove).
 */
function removedFromMapCopy(area: boolean, chart: boolean): string | null {
  const what = [area && "the area", chart && "the chart"].filter(Boolean);
  return what.length ? `We removed ${what.join(" and ")} from the map.` : null;
}

/**
 * The chat question. With no prompts left the chat input is disabled, so
 * the step does not ask the user to send; its status says to skip it.
 */
function AskStepBody({ removed }: { removed: () => string | null }) {
  const noneLeft = useAppValue(promptsExhausted);
  const removedNote = removed();
  if (noneLeft)
    return (
      <>
        {removedNote && <p>{removedNote}</p>}
        <p>{NO_PROMPTS_TODAY}</p>
      </>
    );
  return (
    <>
      <p>
        {removedNote && `${removedNote} `}Now ask in the chat. We have written a
        question for you:
      </p>
      <Example>{CHAT_DEMO_PROMPT}</Example>
      <p>
        Change Kenya to a place you know. Then click{" "}
        <InlineIcon icon={ArrowBendRightUpIcon} weight="bold" /> to send the
        question.
      </p>
      <Tip>
        Your question also includes the chips at the top of the chat box. To
        remove a chip, click the × on the chip.
      </Tip>
      <DailyPromptsNote whenNoneLeft={NO_PROMPTS_TODAY} />
    </>
  );
}

/**
 * The answer step's body: what to check once the answer is in, the question
 * the assistant asked back, or what went wrong when it failed. Re-renders as
 * the answer streams. The status bar says which (and how long the wait is),
 * so the body does not repeat it. The step blocks clicks on the chat once
 * the answer is in, so a question asked back is answered after the tour.
 */
function AnswerStepBody({
  failed,
  askedBack,
}: {
  failed: () => boolean;
  askedBack: () => boolean;
}) {
  const isFailed = useAppValue(failed);
  const isAskedBack = useAppValue(askedBack);
  if (isAskedBack)
    return (
      <p>
        You can answer the question in the chat after the tour. Click{" "}
        <b>{NEXT_LABEL}</b>.
      </p>
    );
  if (isFailed)
    return (
      <p>
        Try the question again after the tour, or ask it in a different way.
      </p>
    );
  return (
    <>
      <p>
        The steps the {AI_ASSISTANT_LABEL} takes show here while it works. When
        the answer is ready, scroll the chat and check it:
      </p>
      <ul>
        <li>
          The card marked <b>{ENTITY_KINDS.area.label}</b>: is it the area you
          meant?
        </li>
        <li>
          The card marked <b>{ENTITY_KINDS.dataset.label}</b>: is it the dataset
          you wanted?
        </li>
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
 * The step blocks clicks on the chart, so Show working is for after the tour.
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
          <b>{INSIGHT_CAPTION_LABELS.curated}</b>: the chart comes directly from
          the source data, like the chart you made manually.
        </li>
      </ul>
      {showsWorking ? (
        <p>
          After the tour, click <InlineIcon icon={MicroscopeIcon} />{" "}
          <b>{WIDGET_CONTROL_LABELS.showWorking}</b> to see how the chart was
          made. {SHOW_PARAMS_TEXT}
        </p>
      ) : (
        <p>
          This answer&apos;s chart is <b>{INSIGHT_CAPTION_LABELS.curated}</b>.{" "}
          {SHOW_PARAMS_TEXT}
        </p>
      )}
      <Tip>{MORE_CHARTS_TIP}</Tip>
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
  let answerBaseline = 0;
  let collapseChecklistOnFinish = false;
  let mapCleared = false;
  let removedFromMap: string | null = null;

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
  const askedBack = () => answerFailed() && lastTurnAsksToChoose();
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
        eyebrow: `Tour · ${FIRST_RUN_STEP_COUNT} steps, ${TOUR_LENGTH}`,
        title: "Welcome to Global Nature Watch Horizon",
        body: (
          <>
            <p>
              Horizon shows data, charts and maps about nature. A good question
              to the {AI_ASSISTANT_LABEL} has three parts:
            </p>
            <Ingredients />
            <p>
              First, you make a chart manually: you choose a dataset and an
              area. Then you ask the {AI_ASSISTANT_LABEL} a question in the
              chat.
            </p>
            <Tip>{TAKE_THE_TOUR_LATER}</Tip>
          </>
        ),
        ctaLabel: "Start the tour",
        secondary: { label: "Skip the tour", onClick: (end) => end(false) },
      },
      {
        id: "open-catalog",
        target: anchorTarget(TOUR_ANCHORS.datasetsButton),
        placement: "top",
        padding: 5,
        eyebrow: "Your dataset",
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
        eyebrow: "Your dataset",
        title: `Turn on ${TCL_NAME}`,
        body: (
          <>
            <p>
              Click the switch on the <b>{TCL_NAME}</b> row. The pink colour on
              the map shows where tree cover was lost each year since{" "}
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
        eyebrow: "Your area",
        title: "Choose an area",
        // Datasets taught the button; here the tour opens the panel itself.
        onEnter: openAreasPanel,
        body: (
          <>
            <p>
              <InlineIcon icon={PolygonIcon} /> <b>{AREAS_LABEL}</b> in the chat
              box opens this panel. Type <b>Kenya</b> in the search box at the
              top. Then click the switch on the <b>Kenya</b> row.
            </p>
            <Tip>
              You can also show a layer from <b>{BOUNDARIES_TAB_LABEL}</b> and
              click an area on the map. Or draw or upload your own area.
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
        title: "View the chart",
        onEnter: closeExplorationPanels,
        body: (
          <>
            <p>
              Your dataset and area now show as chips at the top of the chat
              box. In the chat, click <InlineIcon icon={ChartLineIcon} />{" "}
              <b>{VIEW_NUDGE}</b>
            </p>
            <p>
              This button does not use any of your daily prompts: the questions
              you can ask each day.
            </p>
            <Tip>
              <b>{GENERATE_NUDGE}</b> asks the {AI_ASSISTANT_LABEL} instead, and
              uses 1 of your daily prompts.
            </Tip>
          </>
        ),
        waitFor: hasAcceptedViewAnalysis,
        hint: `Click ${VIEW_NUDGE}`,
        // No area (the search skipped): nothing is offered to analyse.
        skipIf: () => !hasSelectedArea(),
        skipNote: "There is no area on the map.",
      },
      {
        id: "insight",
        // The skeleton carries the same anchor, so the spotlight is on the
        // chart's place while it loads.
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Your chart",
        title: "Read the chart",
        noBack: true,
        // Next once the chart is in, not while it loads. A failed analysis
        // shows no chart, so the step is passed over.
        waitFor: () => insightCount() > 0,
        waitsOnApp: true,
        autoAdvance: false,
        hint: "Waiting for your chart.",
        readyHint: `Your chart is ready. Click ${NEXT_LABEL}.`,
        skipIf: () => !hasAcceptedViewAnalysis() || handRunChartFailed(),
        skipNote: () =>
          hasAcceptedViewAnalysis()
            ? "The chart did not load."
            : "There is no chart to read.",
        body: (
          <>
            <p>
              The chart opens in the card marked <b>{ANALYSIS_CARD_LABEL}</b> on
              the right. The label at the top of the chart says{" "}
              <b>{INSIGHT_CAPTION_LABELS.curated}</b>. This means that the chart
              comes directly from the source data, with no AI.
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
                gives you <b>{DOWNLOAD_ITEM_LABELS.csv}</b>, or{" "}
                <b>{DOWNLOAD_ITEM_LABELS.image}</b> in{" "}
                <b>{WIDGET_CONTROL_LABELS.chart}</b> view.
              </li>
              <li>{SHOW_PARAMS_TEXT}</li>
            </ul>
            <Tip>{MORE_CHARTS_TIP}</Tip>
          </>
        ),
      },
      {
        id: "ask-in-chat",
        target: anchorTarget(TOUR_ANCHORS.chatInput),
        placement: "right",
        eyebrow: "Your question",
        title: "Ask in your own words",
        noBack: true,
        onEnter: () => {
          removedFromMap = removedFromMapCopy(
            hasSelectedArea(),
            insightCount() > 0
          );
          clearAreasAndCharts();
          mapCleared = true;
          chatBaseline = chatMessageCount();
          answerBaseline = answeredCount();
          prefillChatInput(CHAT_DEMO_PROMPT);
        },
        body: <AskStepBody removed={() => removedFromMap} />,
        waitFor: () => sentMessageSince(chatBaseline),
        hint: "Send the question",
        // With no prompts left the input is disabled: the status points at
        // Skip step.
        blockedIf: promptsExhausted,
      },
      {
        id: "answer",
        // The whole panel: the answer is often taller than the screen.
        target: anchorTarget(TOUR_ANCHORS.chatPanel),
        placement: "right",
        padding: 4,
        eyebrow: "Your answer",
        title: "Check the answer",
        noBack: true,
        // Next once the answer is done (or has failed), not while it streams.
        waitFor: () => chatSettledSince(chatBaseline),
        waitsOnApp: true,
        autoAdvance: false,
        hint: `Waiting for the ${AI_ASSISTANT_LABEL}. ${ANSWER_WAIT_COPY}`,
        readyHint: `The answer is ready. Click ${NEXT_LABEL}.`,
        failedIf: answerFailed,
        askedIf: askedBack,
        skipIf: noQuestion,
        skipNote: "There is no question to answer.",
        body: <AnswerStepBody failed={answerFailed} askedBack={askedBack} />,
      },
      {
        id: "ai-chart",
        target: anchorTarget(TOUR_ANCHORS.insightWorkspace),
        placement: "left",
        eyebrow: "Your answer",
        title: "Check the chart",
        // Optional because the copy only makes sense with the chart card on
        // screen: if the card doesn't show, the step is passed over rather
        // than describing a card the user can't see.
        optional: true,
        // No answer, or an answer without a chart: nothing to check here.
        skipIf: () => noAnswer() || insightCount() === 0,
        // The last case: a chart came, but its card never showed.
        skipNote: () =>
          noAnswer()
            ? "There is no chart to check."
            : insightCount() === 0
              ? "The answer has no chart."
              : "The chart did not show on the map.",
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
                      <SparkleIcon /> With the {AI_ASSISTANT_LABEL}
                    </>
                  ),
                  text: "Ask with an area, a dataset and a time range",
                },
              ]}
            />
            <p>
              A chart you make manually uses no prompts and comes directly from
              the source data. Use the {AI_ASSISTANT_LABEL} for other questions,
              such as a comparison.
            </p>
            <p>
              Your next question includes the chips at the top of the chat box.
              To remove a chip, click the × on the chip.
            </p>
            <p>
              Next, try <b>{CHECKLIST_NAME}</b>. It has {CHECKLIST_ITEMS.length}{" "}
              short tasks. You do each task yourself.
            </p>
            <Tip>
              If something does not work, click{" "}
              <InlineIcon icon={ThumbsDownIcon} /> on the answer, or{" "}
              <Link
                href={PREVIEW_FEEDBACK_FORM}
                target="_blank"
                rel="noopener noreferrer"
                color="fg.link"
                textDecoration="underline"
              >
                send us feedback
              </Link>
              . {TAKE_THE_TOUR_LATER}
            </Tip>
          </>
        ),
        ctaLabel: `Open ${CHECKLIST_NAME}`,
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
