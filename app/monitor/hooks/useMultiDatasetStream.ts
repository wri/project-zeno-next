import { useCallback, useMemo, useRef, useState, startTransition } from "react";

import { DATASETS, MAX_CONCURRENT_STREAMS, STREAM_TIMEOUT_MS } from "../constants/datasets";
import { GADM_CODE_TO_NAME } from "../constants/gadmCountries";
import type {
  AggregateStatus,
  DatasetStreamState,
  MultiDatasetFormValues,
  StreamStatus,
} from "../types/stream";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Initial per-dataset state (before any events arrive). */
function makeInitialState(datasetId: number): DatasetStreamState {
  return {
    datasetId,
    status: "connecting",
    statusMessage: "Connecting…",
    query: null,
    dateRange: null,
    aoiSelection: null,
    dataset: null,
    analyticsData: [],
    error: null,
  };
}

/**
 * Simple concurrency pool. Runs up to `concurrency` tasks in parallel,
 * queueing the rest. Every task runs to completion (or rejection) —
 * one failure does not cancel siblings.
 */
async function runWithPool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      try {
        const value = await tasks[i]();
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
}

/** Timestamp helper for status messages. */
function ts(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

/** Resolve "gadm:BRA" → "Brazil", "gadm:BRA.1" → "BRA.1" */
function resolveAreaName(areaId: string): string {
  const code = areaId.replace(/^gadm:/, "");
  return GADM_CODE_TO_NAME[code] ?? code;
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseMultiDatasetStreamReturn {
  /** Per-dataset state, keyed by datasetId. */
  streams: Map<number, DatasetStreamState>;
  /** Aggregate status across all streams. */
  aggregateStatus: AggregateStatus;
  /** Human-readable aggregate message. */
  aggregateMessage: string;
  /** True if any stream is still active. */
  isStreaming: boolean;
  /** Start parallel fetches. */
  run: (values: MultiDatasetFormValues) => void;
  /** Cancel all active streams. */
  cancel: () => void;
  /** Retry a single failed dataset (keeps other results intact). */
  retry: (datasetId: number) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMultiDatasetStream(): UseMultiDatasetStreamReturn {
  const [streams, setStreams] = useState<Map<number, DatasetStreamState>>(
    new Map(),
  );

  // Generation counter — prevents stale closures from writing into state
  // after a new run() has been triggered.
  const generationRef = useRef(0);

  // Per-dataset AbortControllers so we can cancel individually.
  const controllersRef = useRef<Map<number, AbortController>>(new Map());

  // Store the last form values so retry() can re-use them.
  const lastValuesRef = useRef<MultiDatasetFormValues | null>(null);

  // ------------------------------------------
  // Cancel all active streams
  // ------------------------------------------
  const cancel = useCallback(() => {
    for (const controller of controllersRef.current.values()) {
      controller.abort();
    }
    controllersRef.current.clear();
  }, []);

  // ------------------------------------------
  // Update a single dataset's state (batched via startTransition)
  // ------------------------------------------
  const updateStream = useCallback(
    (gen: number, datasetId: number, patch: Partial<DatasetStreamState>) => {
      if (gen !== generationRef.current) return; // stale guard
      startTransition(() => {
        setStreams((prev) => {
          const current = prev.get(datasetId);
          if (!current) return prev;
          const next = new Map(prev);
          next.set(datasetId, { ...current, ...patch });
          return next;
        });
      });
    },
    [],
  );

  // ------------------------------------------
  // Fetch a single dataset via /api/analytics
  // ------------------------------------------
  const fetchDataset = useCallback(
    async (
      gen: number,
      datasetId: number,
      values: MultiDatasetFormValues,
    ) => {
      const controller = new AbortController();
      controllersRef.current.set(datasetId, controller);

      // Per-stream timeout
      const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

      const datasetName = DATASETS[datasetId] ?? `Dataset ${datasetId}`;

      try {
        // Step 1: Mark as fetching metadata
        updateStream(gen, datasetId, {
          status: "metadata",
          statusMessage: `[${ts()}] Fetching ${datasetName}…`,
          dataset: {
            dataset_id: datasetId,
            dataset_name: datasetName,
            reason: "",
            tile_url: "",
            context_layer: null,
            prompt_instructions: "",
            cautions: "",
            description: "",
            methodology: "",
            citation: "",
          },
          dateRange: {
            start_date: values.startDate,
            end_date: values.endDate,
          },
          aoiSelection: {
            name: "Selected areas",
            aois: values.areaIds.map((id) => ({
              name: resolveAreaName(id),
              aoi_type: "gadm",
              subtype: "country",
              src_id: id.replace(/^gadm:/, ""),
            })),
          },
        });

        // Step 2: Call /api/analytics
        const response = await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataset_id: datasetId,
            area_ids: values.areaIds,
            start_date: values.startDate,
            end_date: values.endDate,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "Unknown error");
          updateStream(gen, datasetId, {
            status: "error",
            statusMessage: `API error (${response.status})`,
            error: body,
          });
          return;
        }

        const result = await response.json();

        if (result.error) {
          updateStream(gen, datasetId, {
            status: "error",
            statusMessage: `Analytics error`,
            error: result.error,
          });
          return;
        }

        // Step 3: Extract the analytics data and wrap as AnalyticsDataItem
        // The proxy returns { status: "success", data: <downloaded data> }
        // The downloaded data is typically { data: { result: { ...columnar... } } }
        // or could be raw columnar data or row-oriented data.
        const rawData = result.data;

        // Extract the inner result if present (GFW analytics uses nested data.result)
        let analyticsResult: Record<string, unknown>;
        if (rawData?.data?.result && typeof rawData.data.result === "object") {
          analyticsResult = rawData.data.result;
        } else if (rawData?.data && typeof rawData.data === "object") {
          analyticsResult = rawData.data;
        } else if (rawData && typeof rawData === "object") {
          analyticsResult = rawData;
        } else {
          analyticsResult = {};
        }

        const areaNames = values.areaIds.map(resolveAreaName);

        updateStream(gen, datasetId, {
          status: "analytics",
          statusMessage: `[${ts()}] Received analytics data`,
          analyticsData: [
            {
              dataset_name: datasetName,
              start_date: values.startDate,
              end_date: values.endDate,
              source_url: "",
              aoi_names: areaNames,
              data: analyticsResult,
            },
          ],
        });

        // Step 4: Mark complete
        updateStream(gen, datasetId, {
          status: "complete",
          statusMessage: `[${ts()}] Complete`,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          // Cancelled by user or timeout — don't overwrite if generation moved on
          if (gen === generationRef.current) {
            updateStream(gen, datasetId, {
              status: "error",
              statusMessage: "Cancelled or timed out",
              error: "Request was cancelled or timed out.",
            });
          }
          return;
        }
        updateStream(gen, datasetId, {
          status: "error",
          statusMessage: `Connection error`,
          error: (err as Error).message,
        });
      } finally {
        clearTimeout(timeoutId);
        controllersRef.current.delete(datasetId);
      }
    },
    [updateStream],
  );

  // ------------------------------------------
  // Run: kick off parallel fetches for all selected datasets
  // ------------------------------------------
  const run = useCallback(
    (values: MultiDatasetFormValues) => {
      // Abort anything in-flight
      cancel();

      const gen = ++generationRef.current;
      lastValuesRef.current = values;

      // Initialize all streams to "connecting"
      const initial = new Map<number, DatasetStreamState>();
      for (const id of values.datasetIds) {
        initial.set(id, makeInitialState(id));
      }
      setStreams(initial);

      // Build one task per dataset, run through the concurrency pool
      const tasks = values.datasetIds.map(
        (datasetId) => () => fetchDataset(gen, datasetId, values),
      );
      runWithPool(tasks, MAX_CONCURRENT_STREAMS);
    },
    [cancel, fetchDataset],
  );

  // ------------------------------------------
  // Retry: re-run a single failed dataset
  // ------------------------------------------
  const retry = useCallback(
    (datasetId: number) => {
      const values = lastValuesRef.current;
      if (!values) return;
      if (!values.datasetIds.includes(datasetId)) return;

      // Use the current generation — don't bump it (other streams are still valid)
      const gen = generationRef.current;

      // Reset this dataset to connecting
      updateStream(gen, datasetId, {
        ...makeInitialState(datasetId),
      });

      fetchDataset(gen, datasetId, values);
    },
    [fetchDataset, updateStream],
  );

  // ------------------------------------------
  // Derived state
  // ------------------------------------------
  const aggregateStatus: AggregateStatus = useMemo(() => {
    const states = [...streams.values()];
    if (states.length === 0) return "idle";

    const statuses = states.map((s) => s.status);
    const isActive = (s: StreamStatus) =>
      s === "connecting" || s === "metadata" || s === "analytics" || s === "insights";

    if (statuses.some(isActive)) return "streaming";
    if (statuses.every((s) => s === "complete")) return "complete";
    if (statuses.every((s) => s === "error")) return "error";
    return "partial"; // mix of complete + error
  }, [streams]);

  const aggregateMessage = useMemo(() => {
    const states = [...streams.values()];
    if (states.length === 0) return "";

    const complete = states.filter((s) => s.status === "complete").length;
    const errored = states.filter((s) => s.status === "error").length;
    const total = states.length;

    switch (aggregateStatus) {
      case "streaming": {
        const done = complete + errored;
        return `Fetching ${total} dataset${total > 1 ? "s" : ""}... (${done}/${total} finished)`;
      }
      case "complete":
        return `All ${total} dataset${total > 1 ? "s" : ""} loaded successfully.`;
      case "error":
        return `All ${total} dataset${total > 1 ? "s" : ""} failed.`;
      case "partial":
        return `${complete}/${total} loaded, ${errored} failed.`;
      default:
        return "";
    }
  }, [streams, aggregateStatus]);

  const isStreaming = aggregateStatus === "streaming";

  return {
    streams,
    aggregateStatus,
    aggregateMessage,
    isStreaming,
    run,
    cancel,
    retry,
  };
}
