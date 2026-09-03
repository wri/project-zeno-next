"use client";

/**
 * Conversation Browser — one row per thread from GET /api/traces/sessions,
 * with search, sorting, pagination and drill-through into the Trace Explorer.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/app/lib/router";
import { useRouter, useSearchParams } from "@/app/lib/router";
import {
  Box,
  Button,
  Flex,
  Input,
  Link as ChakraLink,
  Spinner,
  Table,
  Tag,
  Text,
} from "@chakra-ui/react";
import {
  ArrowsClockwiseIcon,
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  DownloadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { FiltersBar } from "./FiltersBar";
import { tabHref } from "./links";
import { InlineAlert } from "./primitives/InlineAlert";
import { PageHeader } from "./primitives/PageHeader";
import { useFiltersStore } from "../model/filtersStore";
import { useSessionsStore, useUsersStore } from "../model/dataStores";
import { fetchSessions } from "../api/zeno";
import { buildUserFirstSeenMap, fetchAllUsers } from "../api/users";
import { keepUserId } from "../lib/filters";
import { baseThreadUrl, type EnvironmentOption } from "../model/config";
import { downloadText, toCsv } from "../lib/csv";
import { formatCount, snippet } from "../lib/format";

const PAGE_SIZE = 50;
const AUTO_FETCH_DEBOUNCE_MS = 400;

type SortKey = "first" | "last" | "turns";

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16).replace("T", " ");
}

export function ConversationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userFilter = searchParams?.get("user");

  const { startDate, endDate, environment, excludeInternal } =
    useFiltersStore();
  const store = useSessionsStore();
  const users = useUsersStore();
  const abortRef = useRef<AbortController | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const signature = `${startDate}|${endDate}|${environment}`;
  const validRange = Boolean(startDate && endDate && startDate <= endDate);

  async function runFetch(sig: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    store.start(sig);
    try {
      const sessions = await fetchSessions(
        {
          startDate,
          endDate,
          environment: environment === "all" ? undefined : environment,
        },
        {
          signal: controller.signal,
          onProgress: (fetched) => store.setProgress(fetched),
        }
      );
      if (controller.signal.aborted) return;
      store.succeed(sessions, sig);
    } catch (error) {
      if (controller.signal.aborted) return;
      store.fail(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    if (!validRange) return;
    if (store.signature === signature && store.status !== "idle") return;
    const timer = setTimeout(
      () => void runFetch(signature),
      AUTO_FETCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, validRange]);

  // Load user emails once so rows show people, not opaque ids.
  useEffect(() => {
    if (users.status !== "idle") return;
    users.start();
    fetchAllUsers()
      .then((all) => users.succeed(all, buildUserFirstSeenMap(all)))
      .catch((error) =>
        users.fail(error instanceof Error ? error.message : String(error))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Link each row to the threads UI for *its own* environment: with the filter
  // set to "all" a single baseThreadUrl(environment) would send every staging
  // session to production. Fall back to the filter env when a row's is null.
  const threadUrlFor = (rowEnv: string | null): string =>
    baseThreadUrl((rowEnv as EnvironmentOption) || environment);

  const rows = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    const filtered = store.sessions.filter((s) => {
      if (!keepUserId(s.userId, { excludeInternal })) return false;
      if (environment !== "all" && s.environment !== environment) return false;
      if (userFilter && s.userId !== userFilter) return false;
      if (searchLower && !s.firstPrompt.toLowerCase().includes(searchLower))
        return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "turns") {
        cmp = a.turnCount - b.turnCount;
      } else if (sortKey === "first") {
        cmp = String(a.firstTimestamp ?? "").localeCompare(
          String(b.firstTimestamp ?? "")
        );
      } else {
        cmp = String(a.lastTimestamp ?? "").localeCompare(
          String(b.lastTimestamp ?? "")
        );
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [
    store.sessions,
    excludeInternal,
    environment,
    userFilter,
    search,
    sortKey,
    sortAsc,
  ]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
    setPage(0);
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return sortAsc ? <CaretUpIcon /> : <CaretDownIcon />;
  }

  function handleDownloadCsv() {
    downloadText(
      toCsv(
        rows.map((s) => ({
          first_timestamp: s.firstTimestamp,
          last_timestamp: s.lastTimestamp,
          turn_count: s.turnCount,
          user_id: s.userId,
          user_email: users.emailByUserId?.get(s.userId) ?? "",
          prompt_snippet: snippet(s.firstPrompt, 120),
          url: `${threadUrlFor(s.environment)}/${s.sessionId}`,
        }))
      ),
      "gnw_session_urls.csv"
    );
  }

  const filterEmail = userFilter ? users.emailByUserId?.get(userFilter) : null;

  return (
    <Flex direction="column" gap={5}>
      <PageHeader
        eyebrow="Zeno API · session threads"
        title="Conversation Browser"
        description="Every conversation thread in the window (deduped server-side by the
          Zeno API) with its first prompt and turn count. Click through to the GNW
          Threads UI or straight into the Trace Explorer."
      />

      <Box
        bg="bg.panel"
        borderWidth="1px"
        borderColor="border"
        borderRadius="sm"
        p={4}
      >
        <FiltersBar />
        <Flex gap={3} mt={4} wrap="wrap" align="center">
          <Input
            size="sm"
            width="280px"
            placeholder="Search first prompts…"
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(0);
            }}
          />
          {userFilter ? (
            <Tag.Root size="md" colorPalette="primary" variant="subtle">
              <Tag.Label>User: {filterEmail ?? userFilter}</Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger
                  onClick={() => router.replace(tabHref("conversations"))}
                >
                  <XIcon />
                </Tag.CloseTrigger>
              </Tag.EndElement>
            </Tag.Root>
          ) : null}
          {rows.length ? (
            <Button size="sm" variant="outline" onClick={handleDownloadCsv}>
              <DownloadSimpleIcon />
              CSV ({formatCount(rows.length)})
            </Button>
          ) : null}
          <Box flex="1" />
          {store.status === "loading" ? (
            <Flex align="center" gap={2} fontSize="xs" color="fg.muted">
              <Spinner size="xs" color="primary.solid" />
              <Text>Fetching… {formatCount(store.progress)} sessions</Text>
            </Flex>
          ) : store.fetchedAt ? (
            <Flex align="center" gap={1} fontSize="xs" color="fg.muted">
              <Text>
                Data as of {new Date(store.fetchedAt).toLocaleTimeString()}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void runFetch(signature)}
              >
                <ArrowsClockwiseIcon />
                Refresh
              </Button>
            </Flex>
          ) : null}
        </Flex>
      </Box>

      {store.status === "error" && store.error ? (
        <InlineAlert
          status="error"
          title="Session fetch failed"
          message={store.error}
        />
      ) : null}

      {store.status === "loaded" && rows.length === 0 ? (
        <InlineAlert
          status="warning"
          message="No sessions found for the selected window/filters."
        />
      ) : rows.length > 0 ? (
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="semibold">
              {formatCount(rows.length)} conversation threads
            </Text>
            {pageCount > 1 ? (
              <Flex gap={2} align="center" fontSize="sm">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Prev
                </Button>
                <Text color="fg.muted">
                  Page {safePage + 1} / {pageCount}
                </Text>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </Button>
              </Flex>
            ) : null}
          </Flex>
          <Box
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border"
            borderRadius="sm"
            overflowX="auto"
          >
            <Table.Root size="sm" striped>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader
                    cursor="pointer"
                    onClick={() => toggleSort("first")}
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    <Flex align="center" gap={1}>
                      Started {sortIndicator("first")}
                    </Flex>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    cursor="pointer"
                    onClick={() => toggleSort("last")}
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    <Flex align="center" gap={1}>
                      Last activity {sortIndicator("last")}
                    </Flex>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    cursor="pointer"
                    textAlign="right"
                    onClick={() => toggleSort("turns")}
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Turns {sortIndicator("turns")}
                    </Flex>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    User
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    First prompt
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    Open
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pageRows.map((row) => {
                  const email = users.emailByUserId?.get(row.userId);
                  return (
                    <Table.Row key={row.sessionId}>
                      <Table.Cell
                        fontFamily="mono"
                        fontSize="xs"
                        whiteSpace="nowrap"
                      >
                        {formatTimestamp(row.firstTimestamp)}
                      </Table.Cell>
                      <Table.Cell
                        fontFamily="mono"
                        fontSize="xs"
                        whiteSpace="nowrap"
                      >
                        {formatTimestamp(row.lastTimestamp)}
                      </Table.Cell>
                      <Table.Cell textAlign="right">{row.turnCount}</Table.Cell>
                      <Table.Cell maxW="200px">
                        <Link
                          href={tabHref("conversations", { user: row.userId })}
                          title={email ?? row.userId}
                        >
                          <Text
                            fontSize="xs"
                            color="fg.link"
                            lineClamp={1}
                            fontFamily={email ? undefined : "mono"}
                          >
                            {email ?? row.userId}
                          </Text>
                        </Link>
                      </Table.Cell>
                      <Table.Cell maxW="420px">
                        <Text fontSize="sm" lineClamp={2}>
                          {snippet(row.firstPrompt, 160)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell whiteSpace="nowrap">
                        <Flex gap={3} fontSize="sm">
                          <ChakraLink
                            href={`${threadUrlFor(row.environment)}/${row.sessionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="fg.link"
                          >
                            GNW <ArrowSquareOutIcon />
                          </ChakraLink>
                          <Link
                            href={tabHref("traces", { session: row.sessionId })}
                          >
                            <Text color="fg.link">Traces</Text>
                          </Link>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      ) : store.status === "loading" ? null : (
        <InlineAlert
          status="info"
          message="Sessions load automatically for the selected window — adjust the filters above."
        />
      )}
    </Flex>
  );
}
