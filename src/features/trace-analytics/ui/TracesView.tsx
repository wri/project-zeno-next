"use client";

/**
 * Trace Explorer — list/filter traces from the Zeno API and inspect a single
 * trace in detail (full conversation comes live from Langfuse). Supports deep
 * links: ?tab=traces&session=<id> / &trace=<id> / &prompt=<text> auto-fetch.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/app/lib/router";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  NativeSelect,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { FiltersBar } from "./FiltersBar";
import { InlineAlert } from "./primitives/InlineAlert";
import { PageHeader } from "./primitives/PageHeader";
import { TraceDetailView } from "./traces/TraceDetailView";
import { useFiltersStore } from "../model/filtersStore";
import { useExplorerStore } from "../model/dataStores";
import { fetchTraceDetail, fetchTraceList } from "../api/zeno";
import { baseThreadUrl, EXPLORER_MAX_TRACES } from "../model/config";
import { formatCount, formatReportDate, snippet } from "../lib/format";
import type { TraceListEntry } from "../model/types";

function entryLabel(entry: TraceListEntry): string {
  const prompt = snippet(entry.prompt, 80) || "(empty prompt)";
  const ts = (entry.traceTimestamp ?? "").slice(0, 19);
  return ts ? `${ts} · ${prompt}` : prompt;
}

export function TracesView() {
  const searchParams = useSearchParams();
  const { startDate, endDate, environment } = useFiltersStore();
  const store = useExplorerStore();

  const [sessionIdFilter, setSessionIdFilter] = useState(
    () => searchParams?.get("session") ?? ""
  );
  const [traceIdFilter, setTraceIdFilter] = useState(
    () => searchParams?.get("trace") ?? ""
  );
  const [promptFilter, setPromptFilter] = useState(
    () => searchParams?.get("prompt") ?? ""
  );
  const [hideEmpty, setHideEmpty] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const lastDeepLinkRef = useRef<string | null>(null);

  async function handleFetch(overrides?: {
    sessionId?: string;
    traceId?: string;
    promptContains?: string;
  }) {
    store.start();
    try {
      const traceId = (overrides?.traceId ?? traceIdFilter).trim();
      const sessionId = (overrides?.sessionId ?? sessionIdFilter).trim();
      const promptContains = (overrides?.promptContains ?? promptFilter).trim();
      if (traceId) {
        // Exact trace id → fetch the single detail directly.
        const detail = await fetchTraceDetail(traceId);
        store.succeed([
          {
            id: detail.id,
            prompt: detail.prompt,
            traceTimestamp: detail.traceTimestamp,
            sessionId: detail.sessionId,
          },
        ]);
        store.cacheDetail(detail);
      } else {
        const entries = await fetchTraceList(
          {
            startDate,
            endDate,
            environment: environment === "all" ? undefined : environment,
            sessionId: sessionId || undefined,
            promptContains: promptContains || undefined,
          },
          {
            maxItems: EXPLORER_MAX_TRACES,
            onProgress: (fetched) => store.setProgress(fetched),
          }
        );
        store.succeed(entries);
      }
    } catch (error) {
      store.fail(error instanceof Error ? error.message : String(error));
    }
  }

  // Deep links (?session= / ?trace= / ?prompt=) fetch immediately on arrival.
  // Unlike the standalone app, the view stays mounted across tab switches, so
  // respond to every *new* deep link, not just the first mount.
  useEffect(() => {
    const session = searchParams?.get("session");
    const trace = searchParams?.get("trace");
    const prompt = searchParams?.get("prompt");
    if (!session && !trace && !prompt) {
      // No deep-link params: reset so navigating back to the *same* link later
      // re-fires instead of matching a stale key.
      lastDeepLinkRef.current = null;
      return;
    }
    const key = `${session ?? ""}|${trace ?? ""}|${prompt ?? ""}`;
    if (lastDeepLinkRef.current === key) return;
    lastDeepLinkRef.current = key;
    setSessionIdFilter(session ?? "");
    setTraceIdFilter(trace ?? "");
    setPromptFilter(prompt ?? "");
    void handleFetch({
      sessionId: session ?? "",
      traceId: trace ?? "",
      promptContains: prompt ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedId = store.selectedId;
  const detail = selectedId ? store.detailCache[selectedId] : undefined;

  useEffect(() => {
    if (!selectedId || store.detailCache[selectedId]) return;
    let cancelled = false;

    async function loadDetail() {
      store.startDetail();
      try {
        const fetched = await fetchTraceDetail(selectedId as string);
        if (!cancelled) store.cacheDetail(fetched);
      } catch (error) {
        if (!cancelled) {
          store.failDetail(
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <Flex direction="column" gap={5}>
      <PageHeader
        eyebrow={`Zeno API · ${formatReportDate(startDate)} → ${formatReportDate(endDate)}`}
        title="Trace Explorer"
        description="Inspect individual traces: the current user turn, assistant output,
          tool calls, metadata and raw JSON. Traces are listed on demand from the Zeno
          API; the full conversation comes live from Langfuse."
      />

      <Box
        bg="bg.panel"
        borderWidth="1px"
        borderColor="border"
        borderRadius="sm"
        p={4}
      >
        <FiltersBar showExcludeInternal={false} />
        <Flex gap={4} mt={4} wrap="wrap" align="flex-end">
          <Box>
            <Text
              fontSize="2xs"
              fontFamily="mono"
              textTransform="uppercase"
              letterSpacing="0.05em"
              color="fg.subtle"
              mb={1}
            >
              Session id
            </Text>
            <Input
              size="sm"
              width="220px"
              placeholder="exact session id"
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.currentTarget.value)}
            />
          </Box>
          <Box>
            <Text
              fontSize="2xs"
              fontFamily="mono"
              textTransform="uppercase"
              letterSpacing="0.05em"
              color="fg.subtle"
              mb={1}
            >
              Trace id
            </Text>
            <Input
              size="sm"
              width="220px"
              placeholder="exact trace id (fetches directly)"
              value={traceIdFilter}
              onChange={(e) => setTraceIdFilter(e.currentTarget.value)}
            />
          </Box>
          <Box>
            <Text
              fontSize="2xs"
              fontFamily="mono"
              textTransform="uppercase"
              letterSpacing="0.05em"
              color="fg.subtle"
              mb={1}
            >
              Prompt contains
            </Text>
            <Input
              size="sm"
              width="220px"
              placeholder="substring…"
              value={promptFilter}
              onChange={(e) => setPromptFilter(e.currentTarget.value)}
            />
          </Box>
          <Button
            size="sm"
            colorPalette="primary"
            onClick={() => handleFetch()}
            loading={store.status === "loading"}
            loadingText={`Fetching… ${formatCount(store.progress)}`}
          >
            <MagnifyingGlassIcon />
            Fetch matching traces
          </Button>
        </Flex>
      </Box>

      {store.status === "error" && store.error ? (
        <InlineAlert
          status="error"
          title="Trace fetch failed"
          message={store.error}
        />
      ) : null}

      {store.selectionLabel ? (
        <Flex
          align="center"
          gap={3}
          wrap="wrap"
          bg="bg.info"
          borderWidth="1px"
          borderColor="border.info"
          borderRadius="sm"
          px={3}
          py={2}
        >
          <Text fontSize="sm">
            Showing <b>{formatCount(store.entries.length)}</b> trace
            {store.entries.length === 1 ? "" : "s"} from Analytics:{" "}
            <b>{store.selectionLabel}</b>. Running a fetch above replaces this
            selection.
          </Text>
          <Button size="xs" variant="outline" onClick={store.clearSelection}>
            Clear selection
          </Button>
        </Flex>
      ) : null}

      {store.status !== "loaded" ? (
        <InlineAlert
          status="info"
          message="Set the date range / filters above, then click “Fetch matching traces”. Provide an exact Trace id to open a single trace directly."
        />
      ) : !store.entries.length ? (
        <InlineAlert
          status="warning"
          message="No traces matched the selected window/filters."
        />
      ) : (
        <>
          <Flex gap={4} wrap="wrap" align="flex-end">
            <Box flex="1" minW="320px">
              <Text
                fontSize="2xs"
                fontFamily="mono"
                textTransform="uppercase"
                letterSpacing="0.05em"
                color="fg.subtle"
                mb={1}
              >
                Select trace ({formatCount(store.entries.length)} matching)
              </Text>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={selectedId ?? ""}
                  onChange={(e) => store.select(e.currentTarget.value || null)}
                >
                  {store.entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entryLabel(entry)}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
            <Checkbox.Root
              size="sm"
              checked={hideEmpty}
              onCheckedChange={(e) => setHideEmpty(!!e.checked)}
              pb={1}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Hide empty messages</Checkbox.Label>
            </Checkbox.Root>
            <Checkbox.Root
              size="sm"
              checked={showRaw}
              onCheckedChange={(e) => setShowRaw(!!e.checked)}
              pb={1}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Show raw JSON</Checkbox.Label>
            </Checkbox.Root>
          </Flex>

          {store.detailStatus === "loading" ? (
            <Flex align="center" gap={2} py={8} justify="center">
              <Spinner size="sm" color="primary.solid" />
              <Text color="fg.muted">Fetching trace detail…</Text>
            </Flex>
          ) : store.detailStatus === "error" && store.detailError ? (
            <InlineAlert
              status="error"
              title="Failed to fetch trace detail"
              message={store.detailError}
            />
          ) : detail ? (
            <TraceDetailView
              detail={detail}
              baseThreadUrl={baseThreadUrl(environment)}
              hideEmpty={hideEmpty}
              showRaw={showRaw}
            />
          ) : null}
        </>
      )}
    </Flex>
  );
}
