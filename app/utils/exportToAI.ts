import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import useMapStore from "@/app/store/mapStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";

export type AIProvider = "claude" | "chatgpt" | "gemini";

export const AI_PROVIDERS: Record<
  AIProvider,
  {
    label: string;
    baseUrl: string;
    // null = no native URL pre-fill support; always falls back to clipboard
    queryParam: string | null;
  }
> = {
  claude: {
    label: "Claude",
    baseUrl: "https://claude.ai/new",
    queryParam: "q",
  },
  chatgpt: {
    label: "ChatGPT",
    baseUrl: "https://chatgpt.com/",
    queryParam: "q",
  },
  // Gemini has no native URL pre-fill — only works via browser extension.
  // We always fall back to clipboard + open blank tab.
  gemini: {
    label: "Gemini",
    baseUrl: "https://gemini.google.com/app",
    queryParam: null,
  },
};

// Claude.ai and ChatGPT accept prompts via ?q= but browser URL limits apply.
const MAX_URL_ENCODED_LENGTH = 1800;
const MAX_DATA_ROWS = 30;

function buildMarkdownTable(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) return "";
  const rows = data as Record<string, unknown>[];
  const sample = rows.slice(0, MAX_DATA_ROWS);
  const headers = Object.keys(sample[0]);
  const header = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = sample
    .map((row) => `| ${headers.map((h) => String(row[h] ?? "")).join(" | ")} |`)
    .join("\n");
  const truncationNote =
    rows.length > MAX_DATA_ROWS
      ? `\n\n_(Showing ${MAX_DATA_ROWS} of ${rows.length} rows — download the full CSV from Global Nature Watch to work with the complete dataset.)_`
      : "";
  return [header, sep, body].join("\n") + truncationNote;
}

function resolveDatasetMeta(): DatasetInfo | null {
  // The visible dataset layer is the active dataset. Skip context sub-layers
  // (parentLayerId set) so we resolve the main dataset's metadata.
  const datasetLayer = useMapStore
    .getState()
    .layers.find((l) => typeof l.datasetId === "number" && !l.parentLayerId);
  if (datasetLayer?.datasetId != null) {
    return DATASET_BY_ID[datasetLayer.datasetId] ?? null;
  }
  return null;
}

export function buildExportPrompt(widget: InsightWidget): string {
  const meta = resolveDatasetMeta();
  const dataTable = buildMarkdownTable(widget.data);

  const datasetName =
    meta?.dataset_name ?? widget.analysisParams?.dataset ?? widget.datasetName;
  const source = meta?.provider ?? meta?.source;

  const parts: string[] = [
    "I was exploring geospatial data on Global Nature Watch and generated the following analysis:",
  ];
  if (datasetName) parts.push(`Dataset: ${datasetName}`);
  if (source) parts.push(`Source: ${source}`);
  if (dataTable) parts.push(`\n${dataTable}`);

  return parts.join("\n");
}

export type ExportMethod = "url" | "clipboard";

export function exportToAI(
  widget: InsightWidget,
  provider: AIProvider
): ExportMethod {
  const { baseUrl, queryParam } = AI_PROVIDERS[provider];
  const prompt = buildExportPrompt(widget);

  if (queryParam) {
    const encoded = encodeURIComponent(prompt);
    if (encoded.length <= MAX_URL_ENCODED_LENGTH) {
      window.open(
        `${baseUrl}?${queryParam}=${encoded}`,
        "_blank",
        "noopener,noreferrer"
      );
      return "url";
    }
  }

  // No URL pre-fill support, or payload too large — clipboard + blank tab
  navigator.clipboard.writeText(prompt).catch(() => {
    // Best-effort; still open the tab even if clipboard write fails
  });
  window.open(baseUrl, "_blank", "noopener,noreferrer");
  return "clipboard";
}
