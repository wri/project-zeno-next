/**
 * Temporary allow-list of today's FSD violations (ADR 0012). Data only.
 *
 * Every entry is a violation that exists on `develop` and is removed by a later
 * step of the FSD migration (epic PZB-1698). The tests fail both on a violation
 * missing from this list (the migration added one) and on an entry that no
 * longer fires (delete it), so the list can only shrink. It is empty at the end
 * of the migration; PZB-1713 deletes this file.
 */
import type { CycleAllow, EdgeAllow } from "./fsd-check";

const DEEP_IMPORT = "same-layer-import-via-index";

// TODO(fsd) PZB-1706: insights-history reaches into dashboards' ui/ instead of
// going through F/dashboards/index.ts.
export const EDGE_ALLOWLIST: EdgeAllow[] = [
  {
    rule: DEEP_IMPORT,
    from: "src/features/insights-history/ui/curated-insights-list.tsx",
    to: "src/features/dashboards/ui/RemoveAnalysisDialog.tsx",
    ticket: "PZB-1706",
  },
  {
    rule: DEEP_IMPORT,
    from: "src/features/insights-history/ui/curated-insights-list.tsx",
    to: "src/features/dashboards/ui/useAddCuratedAnalysisToDashboard.ts",
    ticket: "PZB-1706",
  },
  {
    rule: DEEP_IMPORT,
    from: "src/features/insights-history/ui/insights-panel.tsx",
    to: "src/features/dashboards/ui/CurrentDashboardAnalysisTemplates.tsx",
    ticket: "PZB-1706",
  },
  {
    rule: DEEP_IMPORT,
    from: "src/features/insights-history/ui/insights-panel.tsx",
    to: "src/features/dashboards/ui/RemoveAnalysisDialog.tsx",
    ticket: "PZB-1706",
  },
  {
    rule: DEEP_IMPORT,
    from: "src/features/insights-history/ui/insights-panel.tsx",
    to: "src/features/dashboards/ui/useAddInsightToDashboard.ts",
    ticket: "PZB-1706",
  },
  {
    rule: DEEP_IMPORT,
    from: "src/features/insights-history/ui/insights-panel.tsx",
    to: "src/features/dashboards/ui/useCurrentDashboardArea.ts",
    ticket: "PZB-1706",
  },
];

/** File-level import cycles (strongly connected components), by exact members. */
export const FILE_CYCLE_ALLOWLIST: CycleAllow[] = [
  {
    // TODO(fsd) PZB-1712: ChatPanel ↔ dashboards cycle; the dashboard screens
    // move out of F/dashboards into pages.
    ticket: "PZB-1712",
    members: [
      "app/ChatPanel.tsx",
      "app/ChatPanelCompact.tsx",
      "app/ChatPanelFullSize.tsx",
      "app/components/ChatMessages.tsx",
      "app/components/MessageBubble.tsx",
      "src/features/dashboards/index.ts",
      "src/features/dashboards/ui/DashboardDetailPage.tsx",
    ],
  },
  {
    // TODO(fsd) PZB-1708: chatStore ↔ mapStore cycle; layerManagerSlice's lazy
    // import of chatStore is reversed (Split S3).
    ticket: "PZB-1708",
    members: [
      "app/store/chat-tools/generateInsights.ts",
      "app/store/chat-tools/pickAoi.ts",
      "app/store/chat-tools/pickDataset.ts",
      "app/store/chat-tools/pullData.ts",
      "app/store/chat-tools/showImagery.ts",
      "app/store/chatStore.ts",
      "app/store/layerManagerSlice.ts",
      "app/store/mapStore.ts",
      "app/utils/messageContext.ts",
    ],
  },
];

/** Slice-level cycles (between `src/<layer>/<slice>` nodes). None today. */
export const SLICE_CYCLE_ALLOWLIST: CycleAllow[] = [];
