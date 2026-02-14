# Map Legend Configurable Parameters — PRD

## Overview

Users can adjust tile layer parameters (year range, tree cover threshold, alert confidence)
directly from the legend panel via sliders and toggles. Changes update the map tiles in
real-time, sync to context chips in the chat input, and flow to the backend agent via
`ui_context` so analysis stays current with the user's selections.

---

## Problem Statement

When a dataset is added to the map, its parameters (date range, threshold, confidence) are
fixed at defaults. To change them, the user must re-ask the AI — there's no direct
manipulation. This feature adds interactive parameter controls to the legend, with context
chips that keep the chat agent aware of the user's current selections.

---

## Datasets & Their Configurable Parameters

| Dataset | Params | Control Type | URL Strategy |
|---------|--------|-------------|--------------|
| Tree Cover Loss (4) | start_year, end_year, threshold | dual-handle range slider + single slider | query params |
| Loss Drivers (8) | threshold | single slider | query params |
| Net Flux (6) | threshold | single slider | query params |
| DIST Alerts (0) | start_date, end_date, confidence | dual-handle range slider + toggle | query params |
| Land Cover (1) | year | single slider | path segment (item ID) |
| Grasslands (2) | year | single slider | path segment (item ID) |
| Tree Cover (7) | threshold | single slider | path segment |
| Tree Cover Gain (5) | — | none | — |
| Natural Lands (3) | — | none | — |

---

## Phases

### Phase 1 — Core Param Infrastructure

Extend the type system and URL builder to support all param types.

**ParamSpec type extensions:**
- Add `type: "date"` for date-based params (YYYY-MM-DD format)
- Add `type: "categorical"` for non-numeric params (e.g. confidence)
- Add `options?: { value: string; label: string }[]` for categorical params
- Add `url_strategy: "query" | "path"` to distinguish query param vs path segment replacement
- Add `path_template?: string` — the token in the URL to replace (e.g. `{year}`, `{threshold}`)

**Dual-handle range slider:**
- New `RangeSlider` control in `ParamEditor.tsx` for params that share a range (start/end year, start/end date)
- Add `range_group?: string` to `ParamSpec` — params with the same `range_group` render as a single dual-handle slider
- Min handle cannot exceed max handle (inherent in dual-handle UX)

**`buildTileUrl` extension:**
- Support `url_strategy: "path"` — replace `{token}` in the URL path with the param value
- Support `url_strategy: "query"` (existing behavior)

**Confidence toggle:**
- Render categorical params as a segmented toggle (e.g. "All | High only")
- For DIST: `alert_confidence` with values `all` (no param sent) and `highest`

**Files to create/modify:**
- `app/constants/datasets.ts` — extend `ParamSpec`, update `buildTileUrl`
- `app/components/legend/ParamEditor.tsx` — add `RangeSlider`, categorical toggle

### Phase 2 — Per-Dataset Wiring

Add `configurable_params` to all applicable datasets and ensure tiles reload correctly.

**Datasets to wire:**
- DIST Alerts (0): `start_date`, `end_date` (date range), `alert_confidence` (categorical toggle)
- Land Cover (1): `year` (path segment in item ID, 2015–2024)
- Grasslands (2): `year` (path segment in item ID/collection, 2000–2022)
- Tree Cover (7): `threshold` (path segment `tcd_{threshold}`, 0–100)
- Tree Cover Loss (4): already wired ✅
- Loss Drivers (8): already wired ✅
- Net Flux (6): already wired ✅

**Dynamic legend titles:**
- Legend title updates to reflect active date range, e.g. "Tree cover loss (2010–2020)"
- Show available min/max unobtrusively (e.g. as the slider range labels) so users know
  the full extent without overcrowding the title
- `deriveDateRange()` output rendered in `LayerEntry` subtitle or title suffix

### Phase 3 — Context Chips

Sync param changes to context chips so the chat agent stays informed.

**New context chip types:**
- **Threshold chip**: displays "Tree cover ≥ 30%" — created/updated when user changes
  threshold on any dataset that has one
- **Confidence chip**: displays "Confidence: High only" or "Confidence: All" — for DIST alerts

**Date range chip sync:**
- When user changes year range via legend sliders, update the existing date range context
  chip (or create one if none exists)
- Format: "2010 – 2020" for year-based, "2024-01-01 – 2024-12-31" for date-based

**`ui_context` passthrough:**
- `active_params` already flows via `contextStore` → `chatStore` → `ui_context.dataset_selected`
- Ensure threshold and confidence values are included

**Files to modify:**
- `app/store/contextStore.ts` — add threshold and confidence context item types
- `app/components/ContextMenu.tsx` — render threshold and confidence chips
- `app/components/legend/useLegendHook.tsx` — sync param changes to context chips

---

## Key Types

```typescript
export type ParamSpec = {
  label: string;
  type: "year" | "threshold" | "date" | "categorical";
  default: number | string;
  min?: number;                    // for numeric types
  max?: number;                    // for numeric types
  options?: { value: string; label: string }[];  // for categorical
  url_key: string;                 // query-param name or path token name
  url_strategy: "query" | "path"; // how to inject into the URL
  path_template?: string;         // e.g. "{year}" — the token to replace in the path
  range_group?: string;           // params with same group render as dual-handle slider
};
```

---

## UX Details

- **Commit on release**: sliders commit on drag end, not during drag (avoids tile flood)
- **Reset to defaults**: button appears when any param differs from default
- **Range slider**: dual handles for start/end; handles cannot cross
- **Confidence toggle**: segmented control with "All" and "High only" options
- **Legend title**: dynamically shows active date range; slider labels show available min/max

---

## Out of Scope

- Backend/API changes
- New datasets not already in the app
- Mobile-specific UX
- Undo/redo for param changes

---

## Decisions Log

| Decision | Outcome |
|----------|---------|
| Date range control | Dual-handle range slider (prevents start > end) |
| Confidence control | Segmented toggle: All / High only |
| Path-based params | `buildTileUrl` extended with path segment replacement |
| Context chips | Threshold + confidence get their own chip types |
| Legend title | Dynamic date range suffix; min/max shown on slider labels |
| Commit strategy | On slider release only (avoid tile reload flood) |
| Phasing | 3 phases: infrastructure → dataset wiring → context chips |
