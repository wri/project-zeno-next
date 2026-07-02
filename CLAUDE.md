# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server at localhost:3000
pnpm build            # Production build (Turbopack)
pnpm lint             # ESLint
pnpm format           # Prettier write
pnpm format:check     # Prettier check (used in CI)
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (single run)
pnpm test:watch       # Vitest (watch mode)
pnpm test:coverage    # Vitest with coverage report
```

Run a single test file:

```bash
pnpm test app/utils/__tests__/formatText.test.ts
```

CI runs `format:check → lint → typecheck → build` in that order. All four must pass before merge.

The pre-commit hook (Husky + lint-staged) runs ESLint and Prettier automatically on staged files. The pre-push hook runs `pnpm format:check` on the full repo (same as CI). **Do not bypass hooks with `--no-verify`.**

## Environment

Copy `.env.example` to `.env.local`. `.env.example` documents the required variables:

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=     # Required — map tiles won't load without this
NEXT_PUBLIC_RW_API_URL=              # Defaults to https://api.resourcewatch.org
NEXT_PUBLIC_LANDING_PAGE_VERSION=    # "closed" | "limited" | "public"
NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=      # Set to true to enable /chart-debug
```

`NEXT_PUBLIC_API_HOST` is not in `.env.example` but can be set to override the backend URL (defaults to `https://api.staging.globalnaturewatch.org` in `app/config/api.ts`). Useful when running the backend locally.

## Chart Debug Page

`/chart-debug` renders all chart/table widget fixtures with fake data. Use it to QA chart rendering, axis labels, tooltips, export, fullscreen, and the provenance drawer without needing the AI backend. Requires `NEXT_PUBLIC_ENABLE_DEBUG_TOOLS=true`.

## Architecture

### Layout

The app is a single-page layout defined in `app/app/(chat)/layout.tsx` with a 3-column CSS Grid:

```
[ Sidebar (auto) ] [ ChatPanel (384–624px, resizable) ] [ Map (1fr) ]
```

On mobile, the map is full-screen and the chat panel is a draggable bottom sheet (`BottomSheet.tsx`).

### State Management

All state lives in Zustand stores under `app/store/`:

| Store          | Owns                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `chatStore`    | Messages, loading, thread ID, tool steps, pending trace ID, `dateRange`, `lastSentContext`             |
| `insightStore` | `InsightWidget[]` for the map workspace; cleared on `chatStore.reset()`                                |
| `mapStore`     | MapLibre ref, layers (via `layerManagerSlice`), TerraDraw, flyTo — the AOI + dataset query context     |
| `authStore`    | Auth status, token, prompt usage quota (read from `X-Prompts-Used`/`X-Prompts-Quota` response headers) |
| `sidebarStore` | Sidebar open/closed, thread list                                                                       |
| `promptStore`  | Welcome prompt suggestions (read from `public/welcome-prompts.json`)                                   |

**Key pattern:** tool handlers write to stores imperatively via `.getState()` (outside React); components read reactively via hooks. See `pickAoi.ts` as the canonical example.

### API Client

`app/lib/api-client.ts` exports `apiFetch(path, init)`, which calls the FastAPI backend directly (not through a Next.js route handler). The base URL is `NEXT_PUBLIC_API_HOST`. Auth token is stored in `localStorage` under the key `auth_token` and attached as `Authorization: Bearer <token>`.

### Chat Stream Pipeline

`chatStore.sendMessage()` → POST to `/api/chat` → streams NDJSON from FastAPI → `parseLangChainLine()` → `processStreamMessage()` → dispatches to tool handlers.

Each NDJSON line is a `LangChainResponse` with shape `{ node, timestamp, update }` where `update` is a JSON5-encoded `LangChainUpdate`.

`fetchThread(threadId)` replays the same pipeline from `GET /api/threads/:id`, so tool handlers must work identically for both live streaming and historical thread loading.

#### Stream message types

`parseLangChainLine` maps the backend `kwargs.type` field to a `StreamMessage.type`:

| Backend `kwargs.type`                     | `StreamMessage.type`        | Handler                                                                              |
| ----------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `"ai"`                                    | `"text"`                    | Adds `type: "assistant"` chat message                                                |
| `"tool"`                                  | `"tool"`                    | Dispatches to per-tool handler; also adds a `ToolStepData` to the reasoning timeline |
| `"human"`                                 | `"human"`                   | Reconstructs user message on thread replay                                           |
| _(standalone `trace_id` update)_          | `"other"` (`name: "trace"`) | Attaches Langfuse trace ID to the last assistant message                             |
| `"tool"` with `kwargs.status === "error"` | `"error"`                   | Adds recoverable warning; agent continues with follow-up                             |

**⚠️ Known footgun:** `StreamMessage.type === "text"` represents assistant messages — not `"assistant"`. This naming is intentionally kept as-is while a rename is in progress (tracked via TODO in `chatStore.ts` and `parse-stream-message.ts`). Do not rename the `"text"` branch until that TODO is resolved.

#### Tool handlers (`app/store/chat-tools/`)

| Tool name (`StreamMessage.name`) | Handler                | Effect                                                                                                            |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `generate_insights`              | `generateInsightsTool` | Pushes `InsightWidget[]` into `insightStore`; adds static assistant message to chat                               |
| `pick_aoi`                       | `pickAoiTool`          | Fetches geometry via `/api/geometry/:source/:srcId`, registers in `mapStore.geoJsonRegistry`, flies map to bounds |
| `pick_dataset`                   | `pickDatasetTool`      | Creates a `dataset-card` widget; adds the dataset's layer(s) to `mapStore` (replacing any prior dataset layer)    |
| `pull_data`                      | `pullDataTool`         | No-op — reasoning component in the UI handles display                                                             |

Adding a new tool requires: (1) a handler in `app/store/chat-tools/`, (2) a `dispatch` branch in `processStreamMessage` in `chatStore.ts`, and (3) an entry in `app/lib/tool-display.ts` (active label + error message).

### Insight / Widget Rendering

`generate_insights` writes `InsightWidget[]` into `insightStore` (a dedicated Zustand store) and adds a static `type: "assistant"` message to chat: _"I've created an insight you can view on the map."_ Charts are **not** rendered inline in the chat thread.

`InsightWorkspace` (`app/components/InsightWorkspace.tsx`) is mounted inside `<MapGl>` as an absolute overlay (top-right, `zIndex={400}`). It reads from `insightStore`, shows the most recent insight first, and exposes prev/next navigation with an _"N of M available analyses"_ counter. The card body is delegated entirely to `WidgetMessage` (Chart/Table toggle, fullscreen, CSV download, provenance drawer).

`dataset-card` widgets from `pickDatasetTool` still follow the old path: `type: "widget"` chat message → `MessageBubble → WidgetMessage` inline in chat.

`chatStore.reset()` calls `insightStore.clearInsights()` so the workspace empties when a new thread starts.

### AOI (Area of Interest) Handling

The backend can return either a single `aoi` object or a multi-AOI `aoi_selection: { name, aois[] }`. `pickAoiTool` always normalises to an `AOISelection` before registering geometry in `mapStore.geoJsonRegistry` and adding the area layer(s) to `mapStore.layers`.

- If the AOI already has a `geometry` field, that GeoJSON is used directly (no extra fetch).
- Otherwise, geometry is fetched from `/api/geometry/:source/:srcId`.
- The backend-provided `aoi.bbox` (`[west, south, east, north]`) is used for flyTo, not a Turf-computed bbox, to correctly handle dateline-crossing geometries.
- `"all countries in the world"` triggers a special global vector tile layer instead of fetching per-country GeoJSON.

### Map Overlays

`Map.tsx` has `position="relative"`. React-map-gl renders all non-MapLibre React children as DOM overlays inside the map container. The legend button and privacy links use this pattern (`position="absolute"` children of `<MapGl>`).

### Context Sent to Backend

When sending a message, `chatStore.sendMessage()` derives the active context from the visible `mapStore.layers` + `chatStore.dateRange` (via `deriveContext` in `app/utils/messageContext.ts`) and includes a `ui_context` object in the POST body only if non-empty:

```ts
ui_context.aoi_selected; // first AOI of the first visible area layer: name, gadm_id, src_id, subtype, source
ui_context.dataset_selected; // Full DatasetInfo for the active dataset layer
ui_context.daterange_selected; // { start_date, end_date } as "yyyy-MM-dd"
```

`/api/chat` is **non-idempotent** — each `ui_context` slot appends a synthetic "User selected …" message and overwrites checkpointed agent state — so the client sends **only the slots that changed** since the last send. `chatStore.lastSentContext` tracks the per-slot identity (aoi / dataset / daterange) last sent on the thread; `diffUiContext` drops unchanged slots. The agent's own `pick_aoi`/`pick_dataset` picks are folded into `lastSentContext` (so they are never echoed back), and `fetchThread` seeds it from the rehydrated layers so the first message on a loaded thread doesn't re-announce existing context.

Each user message also carries a read-only `context: MessageContext` snapshot (the **full** active context at send time, not the delta) rendered as static chips under the message by `MessageBubble`.

### Timeout Behaviour

The client aborts the fetch after 310 seconds (5 min 10 sec) — slightly longer than the server-side timeout — so server-emitted timeout errors arrive before the client cancels the connection.

### Testing Conventions

- Test files live in `__tests__/` subdirectories next to the code they test.
- Environment is `node` (no DOM/jsdom). Zustand stores are fully testable via `.getState()` directly — no React needed.
- Zustand stores are module-level singletons. When testing stores, call their reset/clear action in `beforeEach` to prevent state bleeding between tests.
- The `@/` path alias is configured in `vitest.config.ts` to match `tsconfig.json`.

### Commit Convention

Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`, etc. Scope is the affected module or feature area (e.g. `feat(map):`, `fix(chart-widget):`).
