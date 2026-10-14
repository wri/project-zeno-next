"use client";

import { useState } from "react";
import { Badge, Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import {
  EMPTY_PROFILE_ASK_RECORD,
  NUDGE_CONVERSATIONS,
  ProfileNudgeBanner,
  momentFor,
  recordAnswer,
  recordAskShown,
  type ProfileAskMoment,
  type ProfileAskRecord,
} from "@/src/features/front-door";

interface SimState {
  record: ProfileAskRecord;
  conversation: number;
  /** Answers in the current conversation. */
  answers: number;
  profileComplete: boolean;
  /** What the last answer brought, if anything is showing. */
  showing: ProfileAskMoment | null;
  log: string[];
}

const INITIAL: SimState = {
  record: EMPTY_PROFILE_ASK_RECORD,
  conversation: 1,
  answers: 0,
  profileComplete: false,
  showing: null,
  log: [],
};

const LABEL: Record<ProfileAskMoment, string> = {
  card: "Profile card in the chat",
  banner: "Banner above the chat input",
};

/** What the next answer would bring, from the policy itself. */
function describeNextAsk(state: SimState): string {
  if (state.profileComplete) return "Nothing: the profile is complete.";
  const here = momentFor(state.record, state.answers === 0);
  const inNew = momentFor(state.record, true);
  if (here) return `The ${LABEL[here].toLowerCase()}, after the next answer.`;
  if (inNew) {
    return `The ${LABEL[inNew].toLowerCase()}, after the first answer of a new conversation.`;
  }
  return "Nothing in chat: only the account-menu reminder.";
}

function answer(state: SimState): SimState {
  const answers = state.answers + 1;
  // Nobody with a profile is asked: the app's gate stops before the policy.
  const { record, ask } = state.profileComplete
    ? { record: state.record, ask: null }
    : recordAnswer(state.record, answers === 1);
  const entry = `Conversation ${state.conversation}, answer ${answers}: ${
    ask ? LABEL[ask] : "nothing"
  }`;
  return {
    ...state,
    answers,
    record: ask ? recordAskShown(record, ask) : record,
    // The card stays in its conversation; a new answer doesn't remove a
    // banner either.
    showing: ask ?? state.showing,
    log: [entry, ...state.log],
  };
}

function newConversation(state: SimState): SimState {
  const conversation = state.conversation + 1;
  return {
    ...state,
    conversation,
    answers: 0,
    // Leaving a conversation leaves its card behind and closes the banner.
    showing: null,
    log: [`New conversation (${conversation})`, ...state.log],
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} fontSize="sm">
      <Text color="fg.muted">{label}</Text>
      <Text fontWeight="medium" textAlign="right">
        {value}
      </Text>
    </Flex>
  );
}

/**
 * Drives the real ask policy (recordAnswer / recordAskShown) with buttons
 * instead of the agent, so the rules can be tried in seconds.
 */
export function AskRulesSimulator() {
  const [state, setState] = useState<SimState>(INITIAL);
  const { record, showing } = state;

  const close = (entry: string) =>
    setState((s) => ({ ...s, showing: null, log: [entry, ...s.log] }));

  return (
    <Stack gap={4}>
      <Flex gap={2} wrap="wrap">
        <Button
          size="sm"
          colorPalette="primary"
          onClick={() => setState(answer)}
        >
          Get an answer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setState(newConversation)}
        >
          New conversation
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={state.profileComplete}
          onClick={() =>
            setState((s) => ({
              ...s,
              profileComplete: true,
              showing: null,
              log: ["Profile saved", ...s.log],
            }))
          }
        >
          Save the profile
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setState(INITIAL)}>
          Reset
        </Button>
      </Flex>

      <Box borderWidth="1px" borderColor="border" rounded="md" p={3} bg="bg">
        <Stack gap={1}>
          <Stat
            label="Conversation"
            value={`${state.conversation} · ${state.answers} answer(s)`}
          />
          <Stat label="Answers ever" value={String(record.lifetimeAnswers)} />
          <Stat label="Card shown" value={record.cardShown ? "yes" : "no"} />
          <Stat
            label="Banners shown"
            value={`${record.bannersShown} of ${NUDGE_CONVERSATIONS}`}
          />
          <Stat label="Next" value={describeNextAsk(state)} />
        </Stack>
      </Box>

      {showing === "card" && (
        <Flex gap={2} align="center" fontSize="sm">
          <Badge colorPalette="primary">Showing</Badge>
          The profile card, at the end of the conversation.
          <Button
            size="xs"
            variant="ghost"
            onClick={() => close("Not now on the card")}
          >
            Not now
          </Button>
        </Flex>
      )}
      {showing === "banner" && (
        <ProfileNudgeBanner
          onOpen={() =>
            setState((s) => ({
              ...s,
              showing: "card",
              log: ["Add details: the card opens", ...s.log],
            }))
          }
          onDismiss={() => close("Banner closed")}
        />
      )}

      {state.log.length > 0 && (
        <Stack gap={0.5} fontSize="xs" color="fg.muted" fontFamily="mono">
          {state.log.slice(0, 8).map((entry, i) => (
            <Text key={`${state.log.length - i}`}>{entry}</Text>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
