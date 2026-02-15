# Map Legend Configurable Parameters — PRD

## Overview

Users can adjust tile layer parameters (year range, tree cover threshold, alert confidence)
directly from the legend panel via sliders, dropdowns, toggles, and date pickers. Changes
update the map tiles in real-time, sync to context chips in the chat input, and flow to the
backend agent via `ui_context` so analysis stays current with the user's selections. Charts
display the context that was active when they were generated.

---

## Job Stories

1. **When I** am viewing tree cover loss on the map, **I want to** adjust the year range and
   canopy threshold directly from the legend, **so that** I can explore different time periods
   and density thresholds without re-asking the AI.

2. **When I** change a parameter on a map layer, **I want** the chat agent to be aware of my
   current selections (via context chips), **so that** subsequent analysis uses the parameters
   I've chosen.

3. **When I** look at a chart the AI generated, **I want to** see which area, date range,
   dataset, and threshold were active at the time, **so that** I can trust and interpret the
   results correctly.

4. **When I** have multiple datasets active on the map, **I want** the legend to stay compact
   and navigable, **so that** it doesn't obscure the map or overflow off screen.

5. **When I** remove a dataset from the map, **I want** any derived context chips (threshold,
   confidence, date range) to be cleaned up automatically, **so that** stale context doesn't
   mislead the AI in future queries.

6. **When I** am viewing DIST alerts, **I want to** filter by date range and confidence level,
   **so that** I can focus on recent high-confidence disturbance events.

7. **When I** am comparing land cover between two time periods, **I want to** toggle between
   available years (2015 / 2024), **so that** I can visually assess change.

8. **When I** add a new dataset to the map, **I want** it to be expanded in the legend
   automatically, **so that** I can immediately see its symbology and controls.

---

## Problem Statement

When a dataset is added to the map, its parameters (date range, threshold, confidence) are
fixed at defaults. To change them, the user must re-ask the AI — there's no direct
manipulation. This feature adds interactive parameter controls to the legend, with context
chips that keep the chat agent aware of the user's current selections, and context tags on
charts for provenance.

---

## Datasets & Their Configurable Parameters

| Dataset | Params | Control Type | URL Strategy |
|---------|--------|-------------|--------------|
| Tree Cover Loss (4) | start_year, end_year, threshold | dual-handle range slider + dropdown | query params |
| Loss Drivers (8) | threshold | dropdown | query params |
| Net Flux (6) | threshold | dropdown | query params |
| DIST Alerts (0) | start_date, end_date, confidence | date picker + segmented toggle | query params |
| Land Cover (1) | year (2015 or 2024 only) | segmented toggle | path segment (item ID) |
| Grasslands (2) | start_year, end_year | dual-handle range slider | path segment (datetime) |
| Tree Cover (7) | threshold | dropdown | path segment |
| Tree Cover Gain (5) | — | none | — |
| Natural Lands (3) | — | none | — |

---

## Phases

### Phase 1 — Core Param Infrastructure ✅

Extended the type system and URL builder to support all param types.

**ParamSpec type extensions:**
- `type: "year" | "date" | "categorical"` (removed `"threshold"` — thresholds are now categorical)
- `options?: { value: string; label: string }[]` for categorical params
- `url_strategy: "query" | "path"` to distinguish query param vs path segment replacement
- `path_template?: string` — the token in the URL to replace (e.g. `{year}`, `{threshold}`)
- `range_group?: string` — params sharing a group render as a dual-handle slider

**Dual-handle range slider:**
- `RangeParamSlider` in `ParamEditor.tsx` for params with the same `range_group`
- Min handle cannot exceed max handle (inherent in Chakra's `minStepsBetweenThumbs`)

**`buildTileUrl` extension:**
- Path-based params: replaces `{token}` anywhere in the URL string via `replaceAll`
- Query-based params: sets/removes query params via `URLSearchParams`
- Year-to-date conversion: `type: "year"` params with date-format `url_key` auto-append date suffixes
- Categorical "all" handling: removes the query param rather than sending a value

**Categorical controls:**
- ≤3 options → segmented toggle (`SegmentGroup`)
- \>3 options → native `<select>` dropdown (e.g. threshold with 7 values)

**Date inputs:**
- `DateParamInputs` component with `<input type="date">` for sub-daily datasets (DIST alerts)

### Phase 2 — Per-Dataset Wiring ✅

Added `configurable_params` to all applicable datasets.

- **DIST Alerts (0):** `start_date`, `end_date` (date pickers), `confidence` (segmented toggle: All / High only; API values `low`/`high`)
- **Land Cover (1):** `lc_year` (segmented toggle: 2015 / 2024; only two snapshots available)
- **Grasslands (2):** `grass_start_year`, `grass_end_year` (dual-handle range slider, 2000–2022; tile uses end year for datetime filter)
- **Tree Cover (7):** `tc_threshold` (dropdown, path-based `tcd_{value}`)
- **Tree Cover Loss (4):** `start_year`, `end_year` (dual-handle range slider), `threshold` (dropdown) — already wired, updated to new types
- **Loss Drivers (8):** `threshold` (dropdown) — updated
- **Net Flux (6):** `threshold` (dropdown) — updated

**Dynamic legend titles:**
- `deriveDateRange()` produces strings like `(2010–2020)` for year ranges, `(2024-01-01–2024-12-31)` for date ranges, `(2022)` for single years
- Rendered in `LayerEntry` header as a muted suffix after the title
- Slider mark labels show available min/max for full range awareness

### Phase 3 — Context Chips ✅

Synced param changes to context chips so the chat agent stays informed.

**New context chip types:**
- **Threshold** (`TreeIcon`): displays "Tree cover ≥ 30%"
- **Confidence** (`ShieldCheckIcon`): displays "Confidence: All" or "Confidence: High only"

**Date range chip sync:**
- Year range changes upsert the existing date context chip (e.g. "2010 – 2020")
- Date range changes upsert with ISO strings (e.g. "2024-01-01 – 2025-12-31")

**Chip cleanup on layer removal:**
- When a layer is removed, its derived chips (threshold, confidence, date) are only removed
  if no other active layer still provides that param type

**Chart context provenance:**
- `generateInsightsTool` snapshots current context and attaches it to widget messages
- `WidgetMessage` renders context chips (read-only) below the chart description
- Users can see which area, date range, dataset, and threshold were active when the chart was generated

### Post-Phase Refinements ✅

**Accordion legend:**
- Each layer entry is collapsible — header (title + controls) always visible, symbology + notes collapse
- Only one layer expanded at a time; clicking another collapses the current
- Most recently added layer auto-expands
- `maxH: 50vh/60vh` with `overflowY: auto` prevents the legend from overflowing the viewport
- Caret icon rotates to indicate expand/collapse state

**Threshold as dropdown:**
- Fixed values only: ≥ 10%, 15%, 20%, 25%, 30%, 50%, 75%
- Renders as a native `<select>` dropdown (>3 options)

**Land Cover toggle:**
- Only 2015 and 2024 available — renders as a 2-option segmented toggle

---

## Key Types

```typescript
export type ParamSpec = {
  label: string;
  type: "year" | "date" | "categorical";
  default: number | string;
  min?: number;                    // for numeric types (year)
  max?: number;                    // for numeric types (year)
  options?: { value: string; label: string }[];  // for categorical
  url_key: string;                 // query-param name or path token name
  url_strategy: "query" | "path"; // how to inject into the URL
  path_template?: string;         // e.g. "{year}" — the token to replace in the path
  range_group?: string;           // params with same group render as dual-handle slider
};
```

---

## Files Changed

| File | Change |
|------|--------|
| `app/constants/datasets.ts` | `ParamSpec` type, `buildTileUrl` (path + query + year→date), `THRESHOLD_OPTIONS`, `configurable_params` on 7 datasets |
| `app/components/legend/ParamEditor.tsx` | New: `RangeParamSlider`, `DateParamInputs`, `CategoricalToggle` (segmented + dropdown) |
| `app/components/legend/LayerEntry.tsx` | Accordion expand/collapse with `Collapsible`, caret icon, `expanded`/`onToggleExpand` props |
| `app/components/legend/Legend.tsx` | Accordion state management, auto-expand new layers, `maxH` + scroll |
| `app/components/legend/types.ts` | `params` and `LayerActionArgs` accept `string \| number` |
| `app/components/legend/useLegendHook.tsx` | `deriveDateRange` (year + date), param→context chip sync, chip cleanup on remove |
| `app/components/map/layers/DynamicTileLayers.tsx` | URL hash in React key for source re-mount on param change |
| `app/store/mapStore.ts` | `TileLayer.baseUrl`, `TileLayer.params`, `updateTileLayerParams` action |
| `app/store/contextStore.ts` | `activeParams` (string \| number), `updateContextParams` action |
| `app/store/chatStore.ts` | `active_params` in `ui_context.dataset_selected` |
| `app/store/chat-tools/generateInsights.ts` | Snapshot context onto widget messages |
| `app/store/chat-tools/pickDataset.ts` | Pass `active_params` from backend response |
| `app/types/chat.ts` | `active_params` type updated, `UiContext` updated |
| `app/components/ContextButton.tsx` | New context types: `threshold` (TreeIcon), `confidence` (ShieldCheckIcon) |
| `app/components/ContextMenu.tsx` | Filter nav to only user-selectable types (hide threshold/confidence) |
| `app/components/WidgetMessage.tsx` | Render context chips on charts |
| `app/components/MessageBubble.tsx` | Pass `context` to `WidgetMessage` |

---

## UX Details

- **Commit on release**: sliders commit on drag end, not during drag (avoids tile flood)
- **Reset to defaults**: button appears when any param differs from default
- **Range slider**: dual handles for start/end; handles cannot cross
- **Threshold dropdown**: fixed values ≥ 10%, 15%, 20%, 25%, 30%, 50%, 75%
- **Confidence toggle**: segmented control with "All" and "High only" options
- **Land cover toggle**: segmented control with "2015" and "2024" options
- **DIST dates**: native date picker inputs (sub-daily resolution)
- **Legend title**: dynamically shows active date range; slider labels show available min/max
- **Accordion**: one layer expanded at a time; newest auto-expands; scrollable at max height
- **Chart context**: read-only context chips show provenance on generated charts

---

## Out of Scope

- Backend/API changes
- New datasets not already in the app
- Mobile-specific UX optimizations
- Undo/redo for param changes
- Custom threshold values beyond the fixed set

---

## Decisions Log

| Decision | Outcome |
|----------|---------|
| Date range control (year-based) | Dual-handle range slider (prevents start > end) |
| Date range control (DIST) | Native date picker inputs (sub-daily resolution) |
| Confidence control | Segmented toggle: All / High only (API values: `low` / `high`) |
| Threshold control | Dropdown with fixed values (10, 15, 20, 25, 30, 50, 75%) |
| Land cover year | Segmented toggle (only 2015 and 2024 available) |
| Path-based params | `buildTileUrl` does string `replaceAll` on path tokens |
| Context chips | Threshold + confidence get their own chip types (derived, not user-selectable) |
| Chip cleanup | Only remove derived chips when no remaining layer provides that param type |
| Legend overflow | Accordion + max height + scroll |
| Legend expand | Most recently added layer auto-expands; only one at a time |
| Chart provenance | Context snapshot attached to widget messages at generation time |
| Commit strategy | On slider release only (avoid tile reload flood) |
| Categorical rendering | ≤3 options → segmented toggle; >3 options → native select dropdown |
