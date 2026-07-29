"use client";

/**
 * Analytics — per-turn rows from the Zeno API, organised into product-focused
 * tabs. Data auto-fetches when filters change; the previous window of equal
 * length is fetched alongside for KPI deltas.
 *
 * The "Analyse by" toggle picks the unit of analysis: turns (default, one row
 * per user prompt) or conversations (turns aggregated per session client-side
 * — no refetch). The Users and Signals tabs and the report always analyse
 * individual turns: their metrics (prompts per user-day, session depth,
 * funnel, same-prompt retries) are defined on turns within conversations, so
 * the toggle would only degrade them.
 */

import { useEffect, useMemo, useRef } from "react";
import { Box, Button, Flex, Spinner, Tabs, Text } from "@chakra-ui/react";
import {
  ArrowsClockwiseIcon,
  ArticleIcon,
  GaugeIcon,
  PulseIcon,
  SealCheckIcon,
  TimerIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { FiltersBar } from "./FiltersBar";
import { InlineAlert } from "./primitives/InlineAlert";
import { PageHeader } from "./primitives/PageHeader";
import { OverviewTab } from "./analytics/OverviewTab";
import { UsersTab } from "./analytics/UsersTab";
import { OutcomesSection } from "./analytics/OutcomesSection";
import { ToolUsageSection } from "./analytics/ToolUsageSection";
import { CostLatencySection } from "./analytics/CostLatencySection";
import { PromptSection } from "./analytics/PromptSection";
import { TaxonomySection } from "./analytics/TaxonomySection";
import { StarterMixSection } from "./analytics/StarterMixSection";
import { GnwUsageSection } from "./analytics/GnwUsageSection";
import { JourneyFunnelSection } from "./analytics/JourneyFunnelSection";
import { UnmetDemandSection } from "./analytics/UnmetDemandSection";
import { useFiltersStore } from "../model/filtersStore";
import { useAnalyticsStore, useUsersStore } from "../model/dataStores";
import { fetchTracesWindow } from "../api/zeno";
import { withDetectedLanguage } from "../lib/analytics/language";
import { buildUserFirstSeenMap, fetchAllUsers } from "../api/users";
import { keepUserId } from "../lib/filters";
import { baseThreadUrl, DEFAULT_MAX_TRACES } from "../model/config";
import { computeDailyMetrics } from "../lib/analytics/daily";
import { aggregateConversations } from "../lib/analytics/conversationGrain";
import {
  computePromptUtilisation,
  computeSummaryStats,
} from "../lib/analytics/aggregations";
import { classifyUserSegments } from "../lib/analytics/segments";
import { previousRange } from "../lib/analytics/compare";
import { formatCount, formatReportDate } from "../lib/format";
import type { TraceRow } from "../model/types";

const AUTO_FETCH_DEBOUNCE_MS = 400;

function useFilteredRows(
  rows: readonly TraceRow[] | null,
  excludeInternal: boolean,
  environment: string
): readonly TraceRow[] {
  return useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          keepUserId(row.userId, { excludeInternal }) &&
          (environment === "all" || row.environment === environment)
      ),
    [rows, excludeInternal, environment]
  );
}

export function AnalyticsView() {
  const { startDate, endDate, environment, excludeInternal, grain } =
    useFiltersStore();
  const analytics = useAnalyticsStore();
  const users = useUsersStore();
  const abortRef = useRef<AbortController | null>(null);

  const signature = `${startDate}|${endDate}|${environment}`;
  const validRange = Boolean(startDate && endDate && startDate <= endDate);

  async function runFetch(sig: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    analytics.start(sig);
    try {
      const env = environment === "all" ? undefined : environment;
      const prev = previousRange({ startDate, endDate });
      const [rows, prevRows] = await Promise.all([
        fetchTracesWindow(
          { startDate, endDate, environment: env },
          {
            maxItems: DEFAULT_MAX_TRACES,
            signal: controller.signal,
            onProgress: (fetched) => analytics.setProgress(fetched),
          }
        ),
        // Comparison window is best-effort — deltas simply hide on failure.
        fetchTracesWindow(
          { ...prev, environment: env },
          { maxItems: DEFAULT_MAX_TRACES, signal: controller.signal }
        ).catch(() => null),
      ]);
      if (controller.signal.aborted) return;
      analytics.succeed({ rows, prevRows, startDate, endDate, signature: sig });
    } catch (error) {
      if (controller.signal.aborted) return;
      analytics.fail(error instanceof Error ? error.message : String(error));
    }
  }

  // Auto-fetch when the filter signature changes (debounced for date typing).
  useEffect(() => {
    if (!validRange) return;
    if (analytics.signature === signature && analytics.status !== "idle")
      return;
    const timer = setTimeout(
      () => void runFetch(signature),
      AUTO_FETCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, validRange]);

  // Load the user table once per session (first-seen dates + email lookup).
  useEffect(() => {
    if (users.status !== "idle") return;
    users.start();
    fetchAllUsers({ onProgress: (fetched) => users.setProgress(fetched) })
      .then((allUsers) =>
        users.succeed(allUsers, buildUserFirstSeenMap(allUsers))
      )
      .catch((error) =>
        users.fail(error instanceof Error ? error.message : String(error))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawCount = analytics.rows.length;
  const filteredRows = useFilteredRows(
    analytics.rows,
    excludeInternal,
    environment
  );
  // Fill `language` locally (franc) wherever the API left it null.
  const turnRows = useMemo(
    () => withDetectedLanguage(filteredRows),
    [filteredRows]
  );
  // Unit of analysis: per-turn rows as fetched, or one aggregated row per
  // conversation. Purely client-side, so toggling never refetches.
  const conversationGrain = grain === "conversation";
  const rows = useMemo(
    () => (conversationGrain ? aggregateConversations(turnRows) : turnRows),
    [conversationGrain, turnRows]
  );
  const prevTurnRows = useFilteredRows(
    analytics.prevRows,
    excludeInternal,
    environment
  );
  const prevRows = useMemo(
    () =>
      conversationGrain ? aggregateConversations(prevTurnRows) : prevTurnRows,
    [conversationGrain, prevTurnRows]
  );
  // Taxonomy keeps the pre-language-merge rows (see the Content tab comment),
  // aggregated to match the selected grain.
  const taxonomyRows = useMemo(
    () =>
      conversationGrain ? aggregateConversations(filteredRows) : filteredRows,
    [conversationGrain, filteredRows]
  );
  // An empty comparison window (e.g. "All time") makes every delta ±100%
  // noise — treat it the same as an unavailable window.
  const hasPrev = analytics.prevRows !== null && prevTurnRows.length > 0;
  const excludedCount = rawCount - turnRows.length;

  const range = analytics.fetchedRange ?? { startDate, endDate };
  const prevRange = previousRange(range);

  const daily = useMemo(() => computeDailyMetrics(rows), [rows]);
  const stats = useMemo(() => computeSummaryStats(rows), [rows]);
  const prevStats = useMemo(
    () => (hasPrev ? computeSummaryStats(prevRows) : null),
    [hasPrev, prevRows]
  );
  // User-behaviour metrics (prompts per user-day, engagement segments) and the
  // report are defined on turns, so they ignore the grain toggle.
  const utilisation = useMemo(
    () => computePromptUtilisation(turnRows),
    [turnRows]
  );
  const prevUtilisation = useMemo(
    () => (hasPrev ? computePromptUtilisation(prevTurnRows) : null),
    [hasPrev, prevTurnRows]
  );
  const segments = useMemo(
    () =>
      users.firstSeenByUser
        ? classifyUserSegments(
            turnRows,
            users.firstSeenByUser,
            range.startDate,
            range.endDate
          )
        : null,
    [turnRows, users.firstSeenByUser, range.startDate, range.endDate]
  );
  const prevSegments = useMemo(
    () =>
      hasPrev && users.firstSeenByUser
        ? classifyUserSegments(
            prevTurnRows,
            users.firstSeenByUser,
            prevRange.startDate,
            prevRange.endDate
          )
        : null,
    [
      hasPrev,
      prevTurnRows,
      users.firstSeenByUser,
      prevRange.startDate,
      prevRange.endDate,
    ]
  );

  const reportStats = useMemo(
    () => (conversationGrain ? computeSummaryStats(turnRows) : stats),
    [conversationGrain, turnRows, stats]
  );
  const reportContext = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      stats: reportStats,
      utilisation,
      segments,
      totalKnownUsers: users.firstSeenByUser?.size ?? 0,
    }),
    [range, reportStats, utilisation, segments, users.firstSeenByUser]
  );

  const threadUrl = baseThreadUrl(environment);
  const isLoading = analytics.status === "loading";

  return (
    <Flex direction="column" gap={5}>
      <PageHeader
        eyebrow={
          conversationGrain
            ? "Zeno API · conversation aggregates"
            : "Zeno API · per-turn aggregates"
        }
        title="Trace Analytics"
        description="User behaviour and app analytics for the GNW agent. Data refreshes
          automatically when you change the filters, and headline numbers compare
          against the previous period of equal length."
      />

      <Box
        bg="bg.panel"
        borderWidth="1px"
        borderColor="border"
        borderRadius="sm"
        p={4}
      >
        <FiltersBar showGrain />
        <Flex
          gap={3}
          mt={3}
          align="center"
          wrap="wrap"
          fontSize="xs"
          color="fg.muted"
        >
          {isLoading ? (
            <Flex align="center" gap={2}>
              <Spinner size="xs" color="primary.solid" />
              <Text>
                Fetching traces… {formatCount(analytics.progress)} loaded
                {users.status === "loading"
                  ? ` · users ${formatCount(users.progress)}`
                  : ""}
              </Text>
            </Flex>
          ) : analytics.fetchedAt ? (
            <>
              <Text>
                Data as of {new Date(analytics.fetchedAt).toLocaleTimeString()}{" "}
                ·{" "}
                {conversationGrain
                  ? `${formatCount(rows.length)} conversations (from ${formatCount(turnRows.length)} turns)`
                  : `${formatCount(rows.length)} traces`}
                {excludedCount > 0
                  ? ` (${formatCount(excludedCount)} internal/machine excluded)`
                  : ""}
                {hasPrev ? "" : " · comparison window unavailable"}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void runFetch(signature)}
              >
                <ArrowsClockwiseIcon />
                Refresh
              </Button>
            </>
          ) : null}
        </Flex>
      </Box>

      {!validRange ? (
        <InlineAlert
          status="warning"
          message="Start date must be on or before end date."
        />
      ) : null}
      {conversationGrain ? (
        <InlineAlert
          status="info"
          title="Analysing whole conversations"
          message={
            "Each row is one conversation: outcome = how the final turn ended, cost/tokens/tool calls = totals across its turns, latency = total agent time, prompt = the opening ask, dated by the first turn. The Users and Signals tabs and the report always analyse individual turns."
          }
        />
      ) : null}
      {analytics.status === "error" && analytics.error ? (
        <InlineAlert
          status="error"
          title="Trace fetch failed"
          message={analytics.error}
        />
      ) : null}
      {users.status === "error" && users.error ? (
        <InlineAlert
          status="warning"
          title="User data unavailable"
          message={`${users.error}\nNew vs Returning metrics and email lookups are disabled.`}
        />
      ) : null}

      {analytics.status === "loaded" && rows.length === 0 ? (
        <InlineAlert
          status="warning"
          message="No traces matched the selected window/filters."
        />
      ) : null}
      {rawCount >= DEFAULT_MAX_TRACES ? (
        <InlineAlert
          status="warning"
          title="Window truncated"
          message={`Only the first ${formatCount(DEFAULT_MAX_TRACES)} traces were fetched — numbers below understate the full window. Narrow the date range for complete data.`}
        />
      ) : null}

      {rows.length > 0 ? (
        <Tabs.Root defaultValue="overview" lazyMount>
          <Tabs.List>
            <Tabs.Trigger value="overview">
              <GaugeIcon size={16} />
              Overview
            </Tabs.Trigger>
            <Tabs.Trigger value="users">
              <UsersThreeIcon size={16} />
              Users
            </Tabs.Trigger>
            <Tabs.Trigger value="signals">
              <PulseIcon size={16} />
              Signals
            </Tabs.Trigger>
            <Tabs.Trigger value="quality">
              <SealCheckIcon size={16} />
              Quality
            </Tabs.Trigger>
            <Tabs.Trigger value="performance">
              <TimerIcon size={16} />
              Performance
            </Tabs.Trigger>
            <Tabs.Trigger value="content">
              <ArticleIcon size={16} />
              Content
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview">
            <OverviewTab
              rows={rows}
              daily={daily}
              stats={stats}
              prevStats={prevStats}
              utilisation={utilisation}
              prevUtilisation={prevUtilisation}
              segments={segments}
              prevSegments={prevSegments}
              reportContext={reportContext}
              baseThreadUrl={threadUrl}
              prevRangeLabel={`${formatReportDate(prevRange.startDate)} → ${formatReportDate(prevRange.endDate)}`}
              grain={grain}
            />
          </Tabs.Content>

          {/* Users and Signals always analyse turns: their metrics are defined
              on turns within conversations (see the module docstring). */}
          <Tabs.Content value="users">
            <UsersTab
              rows={turnRows}
              segments={segments}
              startDate={range.startDate}
              emailByUserId={users.emailByUserId}
              firstSeenByUser={users.firstSeenByUser}
            />
          </Tabs.Content>

          <Tabs.Content value="signals">
            <Flex direction="column" gap={6}>
              <JourneyFunnelSection rows={turnRows} />
              <UnmetDemandSection rows={turnRows} />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="quality">
            <Flex direction="column" gap={6}>
              <OutcomesSection
                rows={rows}
                prevRows={hasPrev ? prevRows : null}
                daily={daily}
                turnRows={turnRows}
              />
              <ToolUsageSection rows={rows} />
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="performance">
            <CostLatencySection rows={rows} daily={daily} stats={stats} />
          </Tabs.Content>

          <Tabs.Content value="content">
            <Flex direction="column" gap={6}>
              <PromptSection rows={rows} />
              {/* Taxonomy tags from the pre-merge rows so the language axis can
                  compare the raw API value against independent detection. */}
              <TaxonomySection rows={taxonomyRows} />
              <StarterMixSection rows={rows} />
              <GnwUsageSection rows={rows} />
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      ) : null}
    </Flex>
  );
}
