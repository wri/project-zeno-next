import { memo, useCallback, useDeferredValue, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Link,
  NativeSelect,
  Table,
  Text,
} from "@chakra-ui/react";
import { checkLabel } from "../model/checks";
import { STAGE_LABELS } from "../model/config";
import type {
  Attempt,
  AttemptError,
  BenchmarkPage,
  Question,
  QuestionStatus,
} from "../model/types";
import {
  filterQuestions,
  NO_FILTER,
  type QuestionFilter,
  type StatusFilter,
} from "../lib/questions";
import { STAGE_COLORS } from "./palette";
import { Eyebrow, Panel, Segmented } from "./parts";

const STATUS_FILTERS: readonly (readonly [StatusFilter, string])[] = [
  ["all", "All"],
  ["failed", "Failed"],
  ["inconsistent", "Inconsistent passes"],
];

const STATUS_BADGE: Readonly<Record<QuestionStatus, [string, string]>> = {
  pass: ["Passed", "green"],
  inconsistent: ["Inconsistent", "yellow"],
  fail: ["Failed", "red"],
  error: ["Error", "red"],
  uncovered: ["Unchecked", "gray"],
};

function AttemptMarks({ trials }: { readonly trials: readonly boolean[] }) {
  return (
    <HStack
      gap={0.5}
      fontFamily="mono"
      aria-label={trials
        .map((ok, i) => `attempt ${i + 1} ${ok ? "right" : "wrong"}`)
        .join(", ")}
    >
      {trials.map((ok, i) => (
        <Text
          as="span"
          key={i}
          color={ok ? "fg.success" : "fg.error"}
          fontWeight="bold"
        >
          {ok ? "✓" : "✗"}
        </Text>
      ))}
    </HStack>
  );
}

function patternText(perTrial: readonly (boolean | null)[]): string {
  return perTrial
    .map(
      (v, i) =>
        `attempt ${i + 1}: ${v == null ? "did not run" : v ? "passed" : "failed"}`
    )
    .join(" · ");
}

const ATTEMPT_ERRORS: Readonly<Record<AttemptError["kind"], string>> = {
  no_answer: "no reply, counted as wrong",
  unscored: "could not be scored, left out",
};

function AttemptDetail({
  attempt,
  error,
  index,
}: {
  readonly attempt: Attempt | null;
  readonly error: AttemptError | null;
  readonly index: number;
}) {
  const note = error ? `${ATTEMPT_ERRORS[error.kind]} (${error.reason})` : null;
  if (!attempt) {
    return (
      <Box fontSize="xs">
        <b>Attempt {index + 1}</b>: {note ?? "no record"}
      </Box>
    );
  }
  const bits = [
    `tools: ${attempt.tools.length ? attempt.tools.join(" → ") : "none"}`,
  ];
  if (attempt.aoiIds.length) {
    const shown = attempt.aoiIds.slice(0, 4).join(", ");
    bits.push(
      `place: ${shown}${attempt.aoiIds.length > 4 ? ` and ${attempt.aoiIds.length - 4} more` : ""}`
    );
  }
  bits.push(
    `dataset: ${attempt.datasetId ?? "none"}${attempt.contextLayer ? ` (${attempt.contextLayer})` : ""}`
  );
  if (attempt.dates)
    bits.push(`dates: ${attempt.dates[0]} to ${attempt.dates[1] ?? "open"}`);
  if (attempt.nudge) bits.push(`asked the user to choose (${attempt.nudge})`);
  if (attempt.charts)
    bits.push(`${attempt.charts} chart${attempt.charts > 1 ? "s" : ""}`);
  return (
    <Box fontSize="xs" borderLeftWidth="2px" borderColor="border" pl={3}>
      <Text fontWeight="semibold">Attempt {index + 1}</Text>
      {note ? <Text color="fg.error">{note}</Text> : null}
      <Text color="fg.muted" fontFamily="mono" wordBreak="break-word">
        {bits.join(" · ")}
      </Text>
      {attempt.answerExcerpt ? (
        <Text mt={1}>&ldquo;{attempt.answerExcerpt}&hellip;&rdquo;</Text>
      ) : null}
    </Box>
  );
}

function QuestionDetail({ q }: { readonly q: Question }) {
  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }}
      gap={6}
      py={2}
    >
      <Box minW={0}>
        <Heading as="h4" size="xs" mb={2}>
          Checks failed
        </Heading>
        {q.failedChecks.length ? (
          <Box display="grid" gap={2}>
            {q.failedChecks.map((f) => (
              <Box key={f.check} fontSize="xs">
                <Text fontWeight="semibold">
                  {f.check}{" "}
                  <Text as="span" fontWeight="normal" color="fg.subtle">
                    · {STAGE_LABELS[f.stage]}
                  </Text>
                </Text>
                <Text>
                  {checkLabel(f.check)}:{" "}
                  {f.verdict === "fail" ? (
                    <b>failed on at least 2 of 3 attempts</b>
                  ) : (
                    "passed overall, failed on 1 attempt"
                  )}
                </Text>
                <Text color="fg.subtle">
                  {patternText(f.perTrial)}
                  {f.actual ? ` · got ${f.actual}` : ""}
                </Text>
                {f.reason ? <Text color="fg.subtle">{f.reason}</Text> : null}
              </Box>
            ))}
          </Box>
        ) : (
          <Text fontSize="xs">Every check passed on every attempt.</Text>
        )}
        <Heading as="h4" size="xs" mt={4} mb={2}>
          Expected answer{q.drafted ? " (drafted, not yet reviewed)" : ""}
        </Heading>
        <Box
          fontSize="xs"
          fontFamily="mono"
          color="fg.muted"
          wordBreak="break-word"
        >
          {Object.entries(q.expected).map(([k, v]) => (
            <Text key={k}>
              {k} = {v}
            </Text>
          ))}
        </Box>
        {q.traceUrl ? (
          <Link
            href={q.traceUrl}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="primary.solid"
            mt={3}
            display="inline-block"
          >
            Open the trace (team access) →
          </Link>
        ) : null}
      </Box>
      <Box minW={0}>
        <Heading as="h4" size="xs" mb={2}>
          What it did on each attempt
        </Heading>
        <Box display="grid" gap={3}>
          {q.attempts.map((a, i) => (
            <AttemptDetail
              key={i}
              attempt={a}
              error={q.attemptErrors[i]}
              index={i}
            />
          ))}
        </Box>
      </Box>
    </Grid>
  );
}

/** One question and, when open, its detail. Memoised so a keystroke or an
 * expanded row re-renders only the rows whose props changed. */
const QuestionRow = memo(function QuestionRow({
  q,
  isOpen,
  onToggle,
}: {
  readonly q: Question;
  readonly isOpen: boolean;
  readonly onToggle: (id: string) => void;
}) {
  const [badgeLabel, badgeColor] = STATUS_BADGE[q.status];
  return (
    <>
      <Table.Row
        tabIndex={0}
        aria-expanded={isOpen}
        cursor="pointer"
        _hover={{ bg: "bg.subtle" }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "primary.solid",
          outlineOffset: "-2px",
        }}
        onClick={() => onToggle(q.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(q.id);
          }
        }}
      >
        <Table.Cell maxW="28rem" whiteSpace="normal">
          <Text>
            {q.query}
            {q.drafted ? (
              <Badge
                ml={2}
                size="xs"
                colorPalette="yellow"
                title="Expected answer drafted, not yet reviewed"
              >
                DRAFT
              </Badge>
            ) : null}
          </Text>
          <Text fontFamily="mono" fontSize="2xs" color="fg.subtle" mt={0.5}>
            {q.id} · {q.place}
            {q.synthetic ? " · synthetic" : ""}
          </Text>
        </Table.Cell>
        <Table.Cell>{q.typeLabel}</Table.Cell>
        <Table.Cell>
          <Badge colorPalette={badgeColor} size="sm">
            {badgeLabel}
          </Badge>
        </Table.Cell>
        <Table.Cell>
          <AttemptMarks trials={q.trialsRight} />
        </Table.Cell>
        <Table.Cell>
          {q.primaryFailure ? (
            <HStack gap={1.5}>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={STAGE_COLORS[q.primaryFailure]}
              />
              <span>{STAGE_LABELS[q.primaryFailure]}</span>
            </HStack>
          ) : (
            <Text color="fg.subtle">–</Text>
          )}
        </Table.Cell>
        <Table.Cell whiteSpace="normal" fontSize="xs">
          {q.failedChecks.length ? (
            q.failedChecks.map((f) => (
              <Text key={f.check}>
                {checkLabel(f.check)}
                {f.verdict === "pass" ? " (1 attempt)" : ""}
              </Text>
            ))
          ) : (
            <Text color="fg.subtle">none</Text>
          )}
        </Table.Cell>
      </Table.Row>
      {isOpen ? (
        <Table.Row bg="bg.subtle">
          <Table.Cell colSpan={6} whiteSpace="normal">
            <QuestionDetail q={q} />
          </Table.Cell>
        </Table.Row>
      ) : null}
    </>
  );
});

export function QuestionsView({
  page,
  initialUseCase,
}: {
  readonly page: BenchmarkPage;
  readonly initialUseCase: string;
}) {
  const [filter, setFilter] = useState<QuestionFilter>({
    ...NO_FILTER,
    useCase: initialUseCase,
  });
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const search = useDeferredValue(filter.search);
  const rows = filterQuestions(page.questions, { ...filter, search });

  function update(patch: Partial<QuestionFilter>) {
    setFilter((f) => ({ ...f, ...patch }));
  }

  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <Box
      as="section"
      aria-labelledby="questions-title"
      py={{ base: 6, md: 10 }}
    >
      <Eyebrow>All questions</Eyebrow>
      <Heading as="h1" id="questions-title" size="2xl" mt={1}>
        All {page.questions.length} benchmark questions
      </Heading>
      <Text mt={2} color="fg.muted" fontSize="sm" maxW="70ch">
        Each question, its result over three attempts, and which checks it
        failed. Select a row to see what the assistant did on each attempt.
      </Text>

      <Flex mt={5} gap={3} wrap="wrap" align="center">
        <Segmented
          label="Show"
          options={STATUS_FILTERS}
          value={filter.status}
          onChange={(status) => update({ status })}
        />
        <NativeSelect.Root size="sm" width="auto">
          <NativeSelect.Field
            id="questions-type"
            aria-label="Question type"
            value={filter.type}
            onChange={(e) => update({ type: e.target.value })}
          >
            <option value="">All types</option>
            {page.types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <NativeSelect.Root size="sm" width="auto">
          <NativeSelect.Field
            id="questions-use-case"
            aria-label="Use case"
            value={filter.useCase}
            onChange={(e) => update({ useCase: e.target.value })}
          >
            <option value="">All use cases</option>
            {page.useCases.map((u) => (
              <option key={u.key} value={u.key}>
                {u.key}: {u.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Input
          id="questions-search"
          size="sm"
          type="search"
          maxW="18rem"
          placeholder="Search questions or checks"
          aria-label="Search questions or checks"
          value={filter.search}
          onChange={(e) => update({ search: e.target.value })}
        />
        <Text fontSize="sm" color="fg.subtle" aria-live="polite">
          {rows.length} of {page.questions.length} questions
        </Text>
      </Flex>

      <Panel mt={4} p={0} overflowX="auto">
        <Table.Root size="sm" minW="860px">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Question</Table.ColumnHeader>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader>Result</Table.ColumnHeader>
              <Table.ColumnHeader>Attempts</Table.ColumnHeader>
              <Table.ColumnHeader>First failed check</Table.ColumnHeader>
              <Table.ColumnHeader>Checks failed</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} color="fg.subtle">
                  No questions match these filters.
                </Table.Cell>
              </Table.Row>
            ) : null}
            {rows.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                isOpen={open.has(q.id)}
                onToggle={toggle}
              />
            ))}
          </Table.Body>
        </Table.Root>
      </Panel>
    </Box>
  );
}
