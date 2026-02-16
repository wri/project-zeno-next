# Chart & Visualization Components — Audit Report

**Date:** 2026-02-16  
**Scope:** All chart, table, and visualization widget components in the Global Nature Watch frontend  
**Status:** Research only — no code changes made

---

## 1. Summary Table of All Chart/Visualization Components

| Component | File | Renders | Library | Data Source | In Use? |
|---|---|---|---|---|---|
| **ChartWidget** | `app/components/widgets/ChartWidget.tsx` | Bar, stacked-bar, grouped-bar, line, area, pie, scatter | Recharts + `@chakra-ui/charts` | `InsightWidget` props via chat store | ✅ Yes |
| **TimeSeriesWidget** | `app/components/widgets/TimeSeriesWidget.tsx` | Multi-series line chart (time series) | D3.js (raw SVG) | Props (`data`, `xlabel`, `ylabel`, `analysis`) | ❌ **Dead code** — never imported |
| **TableWidget** | `app/components/widgets/TableWidget.tsx` | Data table with ranked badges | Chakra UI `Table` | `Record<string, string\|number\|boolean>[]` props | ✅ Yes |
| **TextWidget** | `app/components/widgets/TextWidget.tsx` | Markdown text block | `react-markdown` | `string` prop | ✅ Yes (but not rendered in `WidgetMessage`) |
| **DatasetCardWidget** | `app/components/widgets/DatasetCardWidget.tsx` | Dataset card (add-to-map toggle) | Chakra UI | `DatasetInfo` prop | ✅ Yes |
| **WidgetMessage** | `app/components/WidgetMessage.tsx` | Orchestrator — dispatches to chart/table/dataset-card widgets | N/A (wrapper) | `InsightWidget` prop | ✅ Yes |
| **formatChartData** | `app/utils/formatCharts.tsx` | Utility — transforms raw API data into Recharts-compatible format | N/A | Called by `ChartWidget` | ✅ Yes |
| **ChartColors** | `app/utils/ChartColors.tsx` | Utility — extracts ordered color palette from Chakra theme tokens | N/A | Called by `formatChartData` | ✅ Yes |
| **Legend components** | `app/components/legend/` | Map legend (sequential, categorical, divergent, color bar) | Chakra UI + custom | Map layers context | ✅ Yes (map only, not chart) |
| **InsightProvenanceDrawer** | `app/components/InsightProvenanceDrawer.tsx` | Drawer showing code/output that generated a widget | Chakra UI Drawer + `react-syntax-highlighter` | `InsightGeneration` prop | ✅ Yes |
| **VisualizationDisclaimer** | `app/components/VisualizationDisclaimer.tsx` | AI disclaimer banner on charts/tables | Chakra UI | Static text | ✅ Yes |

### Dependencies (from `package.json`)
- `recharts` ^3.1.0
- `d3` ^7.9.0 (+ `@types/d3`)
- `@chakra-ui/charts` ^3.22.0

---

## 2. Data Flow: How Charts Are Rendered in the Chat Flow

```
User sends query
    → POST /api/chat (streaming SSE)
    → Backend streams LangChain messages
    → parse-stream-message.ts (app/api/shared/parse-stream-message.ts)
        converts LangChainUpdate → StreamMessage
    → chatStore.ts processes each StreamMessage:
        - type="tool", name="generate_insights"
            → generateInsightsTool() (app/store/chat-tools/generateInsights.ts)
            → maps streamMessage.charts_data[] → InsightWidget[]
            → attaches codeact_parts + source_urls as `generation` provenance
            → calls addMessage({ type: "widget", widgets: [...] })
        - type="tool", name="pick_dataset"
            → pickDatasetTool() creates a dataset-card widget
    → ChatMessages.tsx renders messages via MessageBubble.tsx
    → MessageBubble detects type="widget", renders WidgetMessage for each widget
    → WidgetMessage (app/components/WidgetMessage.tsx):
        - dataset-card → DatasetCardWidget
        - chart types (bar, line, pie, etc.) → ChartWidget
        - table → TableWidget
        - Adds VisualizationDisclaimer + InsightProvenanceDrawer button
```

**Key observation:** The backend determines the chart type via `charts_data[].type`. The frontend has no chart-type negotiation or fallback logic — if the backend sends an unrecognized type, `renderChartItems()` returns `null` silently (line 187, ChartWidget.tsx).

---

## 3. Detailed Findings Per Component

### 3.1 ChartWidget (`app/components/widgets/ChartWidget.tsx`)

**What it renders:** Bar, stacked-bar, grouped-bar, line, area, pie, scatter charts.

**Library:** Recharts 3.x wrapped with `@chakra-ui/charts` (`Chart.Root`, `useChart`, `Chart.Legend`, `Chart.Tooltip`).

**Strengths:**
- Supports 7 chart types through a clean type-map pattern (lines 30–39)
- Custom tooltips for scatter and pie charts with good formatting
- Custom pie legend with color swatches
- Animations disabled (`isAnimationActive={false}`) — good for perceived performance
- Dashed grid lines, no axis lines/ticks — clean visual style

**Issues found:**

| Issue | Severity | Details |
|---|---|---|
| **Fixed max height** | Medium | `maxH="280px"` (line 195) — cramped for complex charts. No way to expand/fullscreen. |
| **No responsive width handling** | High | Chart fills container width via Recharts defaults, but no explicit `ResponsiveContainer`. The `Chart.Root` relies on `overflow="hidden"` which may clip content. |
| **X-axis label truncation** | Medium | `formatXAxisLabel` truncates at 10 chars (formatCharts.tsx line 193). Truncated labels with "..." are not hoverable — the full text is lost. |
| **No axis labels/units** | High | Neither X nor Y axes show a label or unit. Users see numbers like "1.2M" with no context for what they measure. The `xAxis`/`yAxis` field names from the API are used as data keys but never displayed as axis titles. |
| **Pie chart: no percentage display** | Low | Pie tooltip shows raw values but no percentage of total. |
| **Scatter chart: single series only** | Medium | `formatChartData` for scatter creates exactly 1 series (formatCharts.tsx line 148). Multi-series scatter not supported. |
| **Legend overflow** | Medium | Legend has `wrapperStyle={{ maxHeight: "100%", overflow: "auto" }}` but combined with `maxH="280px"` on the root, legends with many items will steal space from the chart. |
| **No empty state** | Medium | If `formatChartData` returns `{ data: [], series: [] }`, the component still renders an empty `Chart.Root` with no user feedback. |
| **No export/download** | Medium | No way to export chart as image or CSV data. The provenance drawer offers source file download, but not the rendered chart itself. |
| **No keyboard navigation** | High | Recharts charts are not keyboard-navigable. No `tabIndex`, no ARIA roles on chart elements. |
| **Color contrast** | Medium | Chart colors come from theme `.500` values. Some (e.g., yellow `#FFD80B`, mint `#00DCA7`) may fail WCAG AA contrast against white backgrounds for small text in legends/tooltips. |
| **Bar chart: no bar radius** | Low | Bars have sharp corners — minor polish issue. |
| **Grouped bar: fragile data pivot** | Medium | `formatChartData` for grouped-bar assumes columns[1] is the group key and columns[2] is the value (formatCharts.tsx lines 174-176). Order-dependent — fragile if API returns columns in different order. |

### 3.2 TimeSeriesWidget (`app/components/widgets/TimeSeriesWidget.tsx`)

**Status: DEAD CODE — never imported anywhere in the codebase.**

**What it renders:** Multi-series line chart with D3.js, direct SVG manipulation.

**Library:** D3.js v7 (raw `d3.select`, `d3.scaleLinear`, `d3.line`, etc.)

**Issues found:**

| Issue | Severity | Details |
|---|---|---|
| **Dead code** | High | Not imported anywhere. `TimeSeriesWidget` and `TimeSeriesDataPoint` are exported but unused. Should be removed or integrated. |
| **Duplicate functionality** | High | Overlaps with ChartWidget's `line` type. Two completely different rendering approaches (D3 vs. Recharts) for the same concept. |
| **D3 tooltip uses innerHTML** | Medium | Line 140: `tooltip.html(tooltipHTML)` with string interpolation — potential XSS if data contains HTML characters. |
| **ResizeObserver without cleanup guard** | Low | The observer callback accesses `parentElement` which could be null during unmount race conditions. |
| **No ARIA/accessibility** | High | Raw SVG with no roles, labels, or descriptions. |
| **Hardcoded colors** | Low | Uses `d3.schemeCategory10` — completely different palette from ChartWidget's theme-derived colors. |
| **Renders Markdown in analysis prop** | Low | Unusual — chart component shouldn't own markdown rendering. Mixes concerns. |

### 3.3 TableWidget (`app/components/widgets/TableWidget.tsx`)

**What it renders:** Striped data table with ranked badge in first numeric column.

**Library:** Chakra UI `Table` component.

**Strengths:**
- Clean, readable table layout
- Auto-formats numbers with locale formatting
- Sentence-case header transformation
- Badge treatment for rank/first-numeric column

**Issues found:**

| Issue | Severity | Details |
|---|---|---|
| **No sorting** | Medium | Users cannot sort by any column. |
| **No pagination** | Medium | Large datasets render all rows. No virtualization or pagination. |
| **No horizontal scroll indicator** | Low | Parent `WidgetMessage` wraps in `overflowX="auto"` (WidgetMessage.tsx line 77), but there's no visual cue that the table is scrollable. |
| **Rank detection heuristic** | Low | Lines 41-43: `isRankKey` checks `key.toLowerCase() === "rank"` OR first column being numeric. This heuristic may misfire on datasets where the first numeric column isn't a rank. |
| **No cell truncation** | Low | Long text values will expand cells. Headers use `whiteSpace="pre"` (line 31) which prevents wrapping but may cause overflow. |
| **No accessibility for data** | Medium | No `caption` element, no `scope` attributes on headers, no `aria-sort` indicators. |
| **No export** | Medium | No CSV/clipboard export for table data. |

### 3.4 TextWidget (`app/components/widgets/TextWidget.tsx`)

**What it renders:** Markdown text block.

**Note:** Defined but never actually rendered in `WidgetMessage.tsx`. The `WidgetMessage` component only routes to `DatasetCardWidget`, `ChartWidget`, and `TableWidget`. There is no `type === "text"` branch. This is effectively dead code unless called from elsewhere.

### 3.5 DatasetCardWidget (`app/components/widgets/DatasetCardWidget.tsx`)

**What it renders:** Interactive card to add/remove a dataset layer from the map.

**Not a visualization per se** — it's a UI control for map layer toggling. No chart-specific issues.

### 3.6 WidgetMessage (`app/components/WidgetMessage.tsx`) — Orchestrator

**Issues found:**

| Issue | Severity | Details |
|---|---|---|
| **No error boundary** | High | If `ChartWidget` or `TableWidget` throws (e.g., malformed data), the entire chat message list could crash. No `ErrorBoundary` wrapper. |
| **TextWidget never rendered** | Low | No routing branch for `type === "text"`. The `TextWidget` component exists but is unreachable. |
| **No loading state** | Low | Charts render immediately from data — no skeleton/loading indicator if data processing takes time. |
| **Provenance button always shown** | Low | The "View how this was generated" button is shown even when `widget.generation` has empty `codeact_parts`. The drawer then shows "No generation details available." |

### 3.7 formatChartData (`app/utils/formatCharts.tsx`) — Data Transformer

**Issues found:**

| Issue | Severity | Details |
|---|---|---|
| **No input validation** | High | No schema validation on incoming data. If `data[0]` is undefined or not an object, multiple `Object.keys(data[0])` calls will throw. |
| **Hardcoded color mappings** | Medium | `CHART_COLOR_MAPPING` (lines 19-75) has domain-specific color maps for `land_cover_type`, `land_type`, and `driver`. These are hardcoded in a utility file — should be in config or fetched from the dataset metadata. The TODO on line 18 acknowledges this. |
| **Grouped-bar: column order dependency** | Medium | Lines 174-176 assume `otherKeys[0]` is the group column and `otherKeys[1]` is the value. This is fragile. |
| **Y-axis formatter inconsistency** | Low | `formatYAxisLabel` returns `string` for abbreviated values but `number` for small values (line 203). The return type annotation says `number` but it actually returns `string` in most branches. |
| **No type safety for chart type parameter** | Low | The `type` parameter includes `"table"` and `"dataset-card"` which are not chart types and cause the function to fall through to the empty return. |

### 3.8 ChartColors (`app/utils/ChartColors.tsx`)

**Issues found:**

| Issue | Severity | Details |
|---|---|---|
| **Runtime theme token extraction** | Low | Uses `theme.tokens.categoryMap` which is an internal Chakra API — may break on Chakra upgrades. |
| **Only 10 colors** | Low | If a chart has > 10 series, colors will cycle. No visual distinction warning. |
| **No colorblind-safe consideration** | Medium | The palette (blue, cyan, mint, green, yellow, orange, red, pink, purple, berenjena) is not tested for colorblind accessibility (deuteranopia, protanopia). Green/red and blue/purple pairs are known problem areas. |

---

## 4. Cross-Cutting Issues

### 4.1 Inconsistencies Across Chart Types

| Aspect | ChartWidget (Recharts) | TimeSeriesWidget (D3) |
|---|---|---|
| **Library** | Recharts + @chakra-ui/charts | Raw D3.js |
| **Color palette** | Theme-derived via `ChartColors.tsx` | `d3.schemeCategory10` |
| **Tooltip style** | Chakra-styled Box components | Raw HTML via `d3.select().html()` |
| **Responsiveness** | Fixed `maxH="280px"`, relies on parent width | `ResizeObserver` with explicit dimensions |
| **Legend** | Recharts `<Legend>` / custom pie legend | Manual Flex layout below chart |
| **Axis formatting** | Custom `formatYAxisLabel`/`formatXAxisLabel` | D3 `format("~f")` / `format(".2s")` |
| **Animation** | Disabled | None (D3 static render) |

These two approaches are completely inconsistent in every dimension. Since `TimeSeriesWidget` is dead code, this is currently moot — but if it's revived, it needs to be reconciled.

### 4.2 Missing Features

1. **No chart export** — Cannot download chart as PNG/SVG or data as CSV (from the chart itself; provenance drawer has source file download)
2. **No fullscreen/expand** — Charts are locked to `maxH="280px"` in the chat flow
3. **No data table toggle** — Cannot switch between chart and table view of the same data
4. **No zoom/pan** — For scatter plots or time series with many points
5. **No annotations** — No ability to highlight specific data points or add reference lines
6. **No dark mode support** — `CustomScatterTooltip` uses hardcoded `bg="white"` (ChartWidget.tsx line 68). Grid and axis colors are hardcoded. Semantic tokens exist in theme but aren't used in chart components.

### 4.3 Accessibility Gaps

1. **No screen reader support** — SVG charts have no `<title>`, `<desc>`, `role="img"`, or `aria-label`. Recharts does not add these by default.
2. **No keyboard navigation** — Charts cannot be focused or explored via keyboard. No tab stops on data points.
3. **Color-only encoding** — All chart types rely solely on color to distinguish series. No patterns, dashes, or shape differentiation for colorblind users.
4. **Table lacks semantic markup** — No `<caption>`, no `scope` on `<th>`, no `aria-sort`.
5. **Contrast concerns** — Yellow (#FFD80B) and mint (#00DCA7) series colors may fail WCAG AA against white backgrounds in legend text.
6. **Tooltip not accessible** — Tooltips are mouse-only; no keyboard or screen reader equivalent.

### 4.4 Performance Concerns

1. **No data size limits** — `formatChartData` processes the entire dataset. With hundreds of rows and many series, Recharts DOM rendering can become slow.
2. **No memoization** — `ChartWidget` calls `formatChartData` and `useChart` on every render. The `renderChartItems()` function is recreated each render.
3. **D3 full-clear on resize** — `TimeSeriesWidget` does `d3.select(chartRef.current).selectAll("*").remove()` on every resize/data change (line 54) — full DOM teardown and rebuild.
4. **Table: no virtualization** — Large tables render all rows to DOM.

### 4.5 UX Issues

1. **280px chart height** — Too small for complex stacked/grouped bars or pie charts with many slices.
2. **X-axis label truncation at 10 chars** — "Bare and sparse vegetation" → "Bare and s..." — key information lost.
3. **No unit display** — Y-axis shows "1.2M" but user doesn't know if it's hectares, km², tonnes CO₂, etc.
4. **Pie chart inner radius** — Donut chart (innerRadius=50, outerRadius=100) is fine for ~5 slices but gets illegible with 15+ slices.
5. **Legend position inconsistency** — Pie legend is right-aligned vertical; all other legends are left-aligned horizontal at top. This is intentional but can feel inconsistent in a chat with mixed chart types.
6. **No "show data" option** — Users can click "View how this was generated" to see code, but cannot see the raw data table behind any chart.

---

## 5. Prioritized Improvement Opportunities

### P0 — Critical / High Impact

| # | Improvement | Rationale |
|---|---|---|
| 1 | **Add error boundaries around chart rendering** | A malformed API response currently crashes the entire chat. Wrap `ChartWidget` and `TableWidget` in React error boundaries with a fallback UI. Files: `WidgetMessage.tsx` |
| 2 | **Add axis labels/units to charts** | Users cannot interpret "1.2M" without knowing the unit. The API should send unit metadata; the frontend should display it. Files: `ChartWidget.tsx`, `formatCharts.tsx`, `chat.ts` (types) |
| 3 | **Add input validation in formatChartData** | Empty or malformed data causes runtime errors. Add guards for `data[0]` existence, key presence, and type checking. File: `formatCharts.tsx` |
| 4 | **Remove dead code (TimeSeriesWidget)** | Unused D3 component adds confusion and maintains a dependency that inflates bundle. If D3 time series is needed, rebuild it on Recharts. File: `TimeSeriesWidget.tsx` |

### P1 — High Value

| # | Improvement | Rationale |
|---|---|---|
| 5 | **Add screen reader support** | Add `role="img"`, `aria-label` with chart summary text, and `<desc>` to chart SVGs. Use the widget's `description` field. Files: `ChartWidget.tsx` |
| 6 | **Support chart expand/fullscreen** | 280px max height is too constraining. Add an expand button that opens the chart in a modal or drawer at larger size. File: `WidgetMessage.tsx`, `ChartWidget.tsx` |
| 7 | **Add CSV export for chart data** | Users need to extract data for reports. Add a download button to the widget header. Files: `WidgetMessage.tsx` |
| 8 | **Fix X-axis label handling** | Replace 10-char truncation with angled labels, responsive tick count, or tooltip-on-hover for axis labels. File: `formatCharts.tsx`, `ChartWidget.tsx` |
| 9 | **Add table sorting and pagination** | Tables with 50+ rows need pagination; all tables benefit from sortable columns. File: `TableWidget.tsx` |
| 10 | **Dark mode support for charts** | Replace hardcoded `bg="white"`, `color="gray.600"` with semantic tokens. Files: `ChartWidget.tsx` (lines 68, 85) |

### P2 — Medium Value

| # | Improvement | Rationale |
|---|---|---|
| 11 | **Colorblind-safe palette** | Add pattern fills or dash styles as secondary encoding. Review palette with colorblind simulation tools. Files: `ChartColors.tsx`, `ChartWidget.tsx` |
| 12 | **Add ResponsiveContainer** | Recharts `ResponsiveContainer` ensures charts resize properly. Currently relying on parent overflow. File: `ChartWidget.tsx` |
| 13 | **Memoize chart data transformations** | Wrap `formatChartData` result in `useMemo` to avoid recomputation on unrelated re-renders. File: `ChartWidget.tsx` |
| 14 | **Move hardcoded color mappings to config** | `CHART_COLOR_MAPPING` in `formatCharts.tsx` should live in a config file or be derived from dataset metadata. File: `formatCharts.tsx` |
| 15 | **Add empty/error states for charts** | Show a meaningful message when data is empty or chart type is unrecognized instead of rendering nothing. File: `ChartWidget.tsx` |
| 16 | **Wire TextWidget into WidgetMessage** | Either add routing for `type === "text"` or remove `TextWidget.tsx`. File: `WidgetMessage.tsx` |

### P3 — Nice to Have

| # | Improvement | Rationale |
|---|---|---|
| 17 | **Chart-to-image export** | Allow saving chart as PNG. Use `html-to-image` or Recharts' built-in SVG access. |
| 18 | **Data table toggle for charts** | "View as table" button to see the underlying data in tabular form. |
| 19 | **Pie chart: show percentages** | Add percentage display in tooltip and optionally as labels. |
| 20 | **Table: horizontal scroll indicator** | Visual affordance (gradient fade or arrow) showing table is wider than viewport. |
| 21 | **Chart animations** | Currently all disabled. Consider subtle entrance animations for polish. |
| 22 | **Scatter plot zoom/pan** | For datasets with many points, allow zoom interaction. |

---

## 6. File Reference Index

| File | Lines of Interest |
|---|---|
| `app/components/widgets/ChartWidget.tsx` | Full file — main chart renderer |
| `app/components/widgets/TimeSeriesWidget.tsx` | Full file — **dead code** |
| `app/components/widgets/TableWidget.tsx` | Full file — table renderer |
| `app/components/widgets/TextWidget.tsx` | Full file — **unreachable from WidgetMessage** |
| `app/components/widgets/DatasetCardWidget.tsx` | Full file — dataset card |
| `app/components/WidgetMessage.tsx` | Lines 30-80 — widget routing logic |
| `app/utils/formatCharts.tsx` | Lines 18-75 — hardcoded color maps; Lines 83-190 — data transformation; Lines 192-210 — axis formatters |
| `app/utils/ChartColors.tsx` | Full file — theme color extraction |
| `app/types/chat.ts` | Lines 14-28 — `InsightWidget` type definition |
| `app/store/chat-tools/generateInsights.ts` | Lines 15-30 — charts_data → InsightWidget mapping |
| `app/store/chatStore.ts` | Lines 147-160 — tool dispatch routing |
| `app/ChatPanelHeader.tsx` | Lines 23-34 — `WidgetIcons` mapping; Lines 43-56 — widget anchor navigation |
| `app/components/InsightProvenanceDrawer.tsx` | Full file — generation provenance viewer |
| `app/components/VisualizationDisclaimer.tsx` | Full file — AI disclaimer |
| `app/theme/index.tsx` | Lines 46-145 — color token definitions |
| `package.json` | Lines 14, 26, 30, 45 — recharts, d3, @chakra-ui/charts deps |
