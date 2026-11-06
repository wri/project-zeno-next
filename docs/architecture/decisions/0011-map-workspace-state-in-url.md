# ADR 0011: Map workspace state lives in the URL, independent of the conversation

- **Status:** Proposed, for engineering review. Phase 0 items are standalone bug fixes and may start before the rest is accepted.
- **Date:** 2026-10-23
- **Authors:** AJ Pain, Claude
- **Scope:** project-zeno-next (map surface, chat panel, sharing) and project-zeno (chat request contract, insights, dataset catalogue). Not a front-end-only change; see "Scope by repo".
- **Supersedes:** ADR-003 "Routing for global conversations" (July 2026, `.claude/docs/ADRs/`, never built). Its option A, the conversation as a query parameter on every surface, is decision 2 below.
- **Related work:** epic PZB-1073 names "resolve the coupled Map versus decoupled Dashboard model" as its follow-on epic; this ADR is that resolution. PZB-1483 shareable map state, PZB-992 insight parameters not reloaded, PZB-1138 non-generative insights reload, PZB-1345 layers ignore the requested date range, PZB-1538 dashboard chat panel.

## Context

A dashboard is a database entity. Its page fetches it by id, the agent learns which dashboard is on screen from `view_context.dashboard_id` and loads it server-side, and user and agent change it through the same API. The conversation is independent of it.

The map has no entity. Its state is derived from the conversation: the thread page replays the thread through the tool handlers that run during live streaming, and whatever they put on the map is the workspace. That model has these consequences today (evidence and file references in Appendix A, verified 2026-10-23 at project-zeno-next `develop` `a65aec98` and project-zeno `main` `69fba963`):

- **Replay restores a subset.** The agent's picks, imagery, insights and the user's area and date selections come back. Dataset picks from the Data catalog, drawn or uploaded areas, hidden or removed layers, order, opacity, viewport, and analyses started from the Analyze flow do not: they never entered the thread. Replay is order-sensitive, and the backend drops a selection that returns to an earlier value.
- **The agent sees the map through a lossy delta.** `ui_context` sends the first visible area only, the catalogue entry for the first dataset layer without its live context layer or threshold, and the pinned date range, each only when it changed. The backend overwrites its selection from it and nothing ever clears a selection, so a removed layer stays selected. `view_context` carries the viewport and the insights on screen, is stored as reference material by a deliberate rule in `docs/view-context-pages.md` ("no eager hydration"), and already types `visible_layers` and `visible_aois`, which `inspect_view_context` lists by name; nothing writes a selection from them.
- **The conversation is in the map's path and nowhere else.** `/app/threads/:id` holds it; dashboard URLs do not, so a refresh on a dashboard drops the conversation. Moving from a dashboard to the map in the same session does not replay (the store already holds the thread), so the plan's original "the map rebuilds from a conversation that never touched the map" is not what breaks. What breaks is that camera moves run against a map that is not on screen, and the camera never frames the area on return.
- **Sharing is the thread.** The share dialog copies the thread URL once the thread is public; the recipient replays it. Layers, areas and viewport do not travel.
- **Parameters are not stored with the things they describe.** An insight row holds no area, dates, context layer or threshold; those live only on statistics rows, which have no API and are empty for Analyze and template insights. The frontend rebuilds an insight's parameter chips at render time from whatever is on the map, and the analysed dates never reach it (PZB-992, root cause in Appendix A). A layer's year range exists only as text in its tile URL, from two sources with different date conventions (PZB-1345); the backend PRs that would have declared a convention per dataset were closed unmerged.

### Goals

1. The workspace is independent of the conversation; a conversation is a layer on top of any workspace and moves between the map and a dashboard.
2. Both the user and the agent change the map, and the agent always sees the current map state.
3. Loading and sharing a map fetches what is on it by reference. No replay.
4. Every layer and analysis is restored with the parameters it was built with, on reload, share and navigation between pages.

Terms used below: a **reference** is an id for something that already exists server-side (an area, a dataset, an insight). The **layer registry** is a backend endpoint describing each dataset's layers by id (decision 4). **Reference semantics** means the agent may read a value but no code writes a selection from it, the rule `view_context` follows today.

## Decision

### 1. The workspace is a set of references, serialised in the URL

The workspace is what is on the map: areas, layers, analyses, the pinned analysis date range, and the viewport. Each item is a reference plus the parameters it was built with. The URL holds the references. Data flows one way: the stores write to the URL on every change, and the URL is read only on load and on back/forward navigation. No component reads workspace state from the URL directly, and no database entity is created for the map (alternative A says when to revisit that).

Proposed grammar, owned by one frontend module that serialises and parses:

```
/app?thread=<uuid>
    &areas=gadm:BRA.16_1,kba:16595,custom:<uuid>
    &layers=4;cc=30;y=2018-2022;ctx=primary_forest,12;sub=agriculture;d=2016-01-01..2024-12-31;hidden
    &analyses=<insight-id>,<insight-id>
    &dates=2018-01-01..2022-12-31
    &view=-3.4,-52.1,5.2
    &v=1
```

Rules. One parameter per collection. Items are separated by commas; an item is its id followed by `;key=value` parameters; values are percent-encoded, so a comma or semicolon never appears unescaped inside one. `layers` order is draw order, top first; `hidden` keeps a switched-off layer restorable; `sub` names the selected sub-layer of a multi-layer dataset; `ctx` the context layer. An area is `source:src_id`, never a display name (`docs/review-lessons.md`). `view` is centre and zoom. `v` is the schema version so a later change can still read old links. Nothing is hashed; every URL is readable and reversible. Parameters outside the grammar are preserved when the workspace changes: `ff`, `agent_profile` and anything unknown. `prompt` is the exception: it is consumed once and removed (decision 2). Opacity and the boundary-layer choice are display preferences and are not encoded.

### 2. The conversation is `?thread=` on every surface, and the map page stops resetting on mount

The path names the surface (`/app`, `/dashboards/:id`); the conversation rides as `?thread=`. Dashboards gain a conversation that survives refresh. The route renames from ADR-003 are deferred as unrelated.

Three consequences for `/app`:

- The index page resets the stores and seeds the default layer only when the URL carries neither workspace parameters nor `thread`. Today it resets on every mount, which would wipe the workspace on every return from a dashboard.
- URL writes go through the router with `replace`, merging into the current search; `window.history.replaceState` is not used, because it bypasses the router's location and leaves `useSearchParams` consumers stale. The route table already keeps the map mounted while `/app`'s search changes, so stamping `?thread=` after the first message is not a navigation. The `SingleThread` page and the "already holds this thread, skip the reset" choreography are deleted.
- `?prompt=` is honoured only when the URL carries no `thread`, is submitted once, and is removed from the URL on submit, so a reload cannot submit it again into a new thread (`docs/review-lessons.md`, the `?prompt=` guard).

Old `/app/threads/:id` links redirect to `/app?thread=:id`; the redirects ship with the sharing slice (decision 7). A `?thread=` the user does not own and that is not public is dropped with a toast. The backend returns 403 for a `POST /api/chat` on a thread owned by someone else; today it tries to insert a duplicate primary key, and a copyable thread parameter makes that 500 reachable.

### 3. Hydration is by reference, in this order

On load the map page hydrates from the first of:

1. **The URL.** Areas by `GET /api/geometry/{source}/{src_id}`; layers from the layer registry by dataset id plus parameters; analyses by `GET /api/insights/{id}`, including the parameters stored with them (decision 4).
2. **The thread's stored state**, when the URL carries a `thread` but no workspace parameters: the last map snapshot the agent received (decision 5 stores it in state as `view_context`), and for threads older than decision 5 the `aoi_selection`, `dataset`, dates and `insight_id` from `GET /api/threads/{id}/state`. The URL is rewritten with what was derived. This serves sidebar history links and redirected old links with one state fetch and no replay. Old threads hydrate without layer parameters, because their stored `dataset` is the catalogue entry without canopy or years; goal 4 holds only for workspaces created after this change.
3. **An empty map** with the default layer, as `/app` does today.

A `thread`, when present, loads the chat transcript only. Tool handlers get an explicit mode: live streaming applies the agent's edits to the map (decision 6); replay renders chat cards and never writes the map stores. The context chips under a user message are built from the snapshot that message was sent with: live from the store, on replay from the `view_context` value the backend emits with that turn (`replay_chat` already emits every changed state value). Today they are rebuilt from the replayed map, which decision 3 removes.

### 4. Parameters live where the thing lives

A **layer** carries its parameters in the URL (dates or years, canopy threshold, context layer, sub-layer). The frontend builds it from the layer registry: the catalogue endpoint gains, per dataset, each layer's tile URL template, date convention, coverage bounds, defaults and context layers, along the lines of the closed project-zeno #820. The frontend copies of tile URLs are deleted once the registry is consumed (PZB-1345).

An **analysis** is an insight id, and the insight carries its parameters server-side. The backend persists, for every creation path (agent, `/api/analyze`, dashboard templates): areas (source, src_id, subtype, name), dataset id and name, the effective start and end dates, context layer, the canopy threshold actually sent, and any other analytics parameter. It returns them on `GET /api/insights/{id}`, on the list endpoint and in the `generate_insights` stream update. The frontend parses them once at the boundary into `AnalysisParams` and deletes the render-time fallbacks that read map state. Analyses are never re-run on load. This fixes PZB-992 and is a prerequisite for decision 3, so it is Phase 0.

The **pinned analysis date range** (`chatStore.dateRange`) is workspace state, encoded as `dates`.

### 5. Agent awareness: one snapshot per turn, diffed on the backend (proposal A)

Every message from the map page carries the workspace in `view_context`. The backend already types `visible_layers`, `visible_aois` and `visible_insights`; this extends those models with `dataset_id`, `parameters`, `subtype` and a new `dates` field, all typed rather than left to `extra="allow"`:

```json
{
  "page": "map",
  "viewport": { "bbox": [w, s, e, n], "zoom": 5.2 },
  "visible_aois": [{ "source": "gadm", "src_id": "BRA.16_1", "subtype": "state", "name": "Pará" }],
  "visible_layers": [
    {
      "id": "dataset-4",
      "dataset_id": 4,
      "name": "Tree cover loss",
      "parameters": { "canopy_cover": 30, "start_year": 2018, "end_year": 2022, "context_layer": "primary_forest" }
    }
  ],
  "visible_insights": ["<insight-id>"],
  "focused_insight": { "id": "<insight-id>", "chart_position": 0 },
  "dates": { "start_date": "2018-01-01", "end_date": "2022-12-31" }
}
```

"Visible" means what the user sees: hidden layers are in the URL but not in the snapshot, and a layer the user dismissed from context with the chip's cross (`excludedContextLayerIds`) is omitted too. There is no change history; toggling a layer on and off between messages is not reported. The snapshot is kept small (ids, names, parameters), because it is stored in the checkpoint every turn and `inspect_view_context` renders it into the prompt.

The change is one of semantics: these keys move from reference to actionable, on the map page only. The backend compares the snapshot with the agent's current selection by identity (areas by source and src_id, dataset by id and parameters, dates by value). Where they differ, the user changed the map: the backend writes `aoi_selection`, `dataset`, `start_date` and `end_date`, setting a field to `None` when the snapshot no longer has it (these are plain last-write channels, so `None` clears them), and adds one synthetic user message describing the change ("Map changed since the last message: added area Pará; removed dataset Tree cover loss"). Where they match, nothing happens, which is how the agent's own edits are handled: a tool writes the state, the frontend applies it to the map, the next snapshot agrees. The diff is a pure function with unit tests. `ui_context` and the frontend's `lastSentContext` and `diffUiContext` are retired.

Two selection rules the diff needs. With several visible areas, all of them become the `aoi_selection`, and the map page prompt tells the agent to ask when a question needs one. With several visible dataset layers, the topmost in draw order is the `dataset`, as `ui_context` picks the first today. `statistics` accumulates and is not cleared, so pulls for a removed dataset remain visible to the analyst; the session block's dataset line is what tells it which one is current (risk below).

The "no eager hydration" rule is reversed for the map page only. It was written for dashboards, where a user may browse one dashboard while talking about something else; on the map, what the user has put on the map is the deliberate selection. Dashboards keep reference semantics. A message sent from a dashboard carries no map snapshot and, once `ui_context` is retired, no selection at all, so the agent's selection stays as the tools left it. That is a change: today a dashboard message can re-announce an area or dataset left in the map store from an earlier map visit.

**Alternative B, the fallback:** keep the `ui_context` deltas as the actionable channel, add a deselect slot so a removal can clear state, and send the snapshot alongside as reference. Less backend change, but the frontend keeps the last-sent-context logic, the agent holds two pictures of the map, and `dataset_selected` has to be rebuilt to carry live parameters. Proposal A is recommended; B is acceptable if the backend owners judge the diff too invasive for the first slice.

### 6. Agent edits go through the same path as user edits

A tool result that changes the map (`pick_aoi`, `pick_dataset`, `show_imagery`, `show_planet_imagery`, `generate_insights`, `update_insight_display`) writes to the stores exactly as the Areas panel and the Data catalog do, and the URL sync serialises the result. One rule changes: `pick_dataset` replaces the layer of the agent's previous pick, not every dataset layer on the map as it does today, so a layer the user added by hand survives the agent's next pick. The topmost visible dataset layer is then the selection (decision 5).

### 7. Sharing a map shares the map

The share action on the map produces the workspace URL: areas, layers, viewport and dates, with `thread` and `analyses` stripped. Conversations keep their own share (public thread) and dashboards keep theirs; analyses are shared through those, not through a map link. This mirrors the "map only" scope of PZB-1483 and is recorded as a product question below. The redirects for old thread links (decision 2) ship in this slice.

### 8. Backend scope is accepted

The backend work is: the typed snapshot, diff and state writes with clears (decision 5); insight parameters persisted and returned on every creation path (decision 4); the layer registry (decision 4); the 403 on posting to another user's thread (decision 2); and two corrections the current design already needs: the `/api/analyze` promise to write thread state is removed or honoured, and `replay_chat` stops de-duplicating recurring values (no longer on the map's path, but it still feeds the transcript and the chips in decision 3).

## Alternatives considered

| Alternative                                                   | Why not                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. A server-side map entity**, saved like a dashboard       | The state is a handful of pointers to things that already have ids and owners; an entity adds save and load semantics, ownership and migrations for no new information. Revisit if URLs outgrow their budget or if permanent short links or embeds (PZB-1483 nice-to-haves) are wanted; the grammar then becomes its payload. |
| **B. Keep replay and fix its gaps**                           | Replay is lossy by construction (user actions outside the conversation are not in the thread), order-sensitive, and wrong on recurring values. Every fix keeps the coupling the goals reject.                                                                                                                                 |
| **C. Thread in the path on every surface** (ADR-003 option C) | Combinatorial route tree, a real navigation on the first message, and the reset choreography multiplies per surface. Rejected in ADR-003 for the same reasons.                                                                                                                                                                |
| **D. Analysis parameters in the URL, re-run on load**         | Costs an analytics call and, for generative insights, an LLM run per load, with non-deterministic text. The insight already has an id; store its parameters with it.                                                                                                                                                          |
| **E. The whole workspace in `localStorage`**                  | Not shareable, not linkable, one device.                                                                                                                                                                                                                                                                                      |

The snapshot channel's own alternative (deltas plus deselect) is alternative B inside decision 5.

## Consequences

**Gained.** Reload, share and navigation between map and dashboard never replay the conversation into the map. Dashboards keep their conversation across a refresh. A map link is enough for a colleague to see the same layers, areas and viewport. The agent's selection follows the map, including removals. Every insight carries its own parameters on every surface, which fixes the chips (PZB-992) and gives the Analyses pane and dashboards the same provenance as the workspace. Layer tile URLs have one owner.

**Given up or changed.** The thread leaves the path, so route-level analytics lose the thread dimension (check `docs/analytics.md` for page tracking keyed on it). The map page's "no eager hydration" rule is reversed. A dashboard message no longer carries a map selection. A shared map never includes analyses (product question). The URL is long for a busy map (risk below). `pick_dataset` stops clearing hand-added layers.

**Contracts touched** (`docs/contracts.md` in the GNW workspace): the chat request (typed map snapshot in `view_context`, retirement of the `ui_context` selection slots), the chat stream (`generate_insights` carries parameters), the insight response (`parameters`, additive), the catalogue endpoint (layer definitions, additive), and the eval state contract. GOLD evaluators read `aoi_selection`, `dataset`, `start_date`, `end_date`, `statistics`, `charts_data`, `codeact_parts`, `nudge`, `dashboard_id` and `messages` from `GET /api/threads/{id}/state`; decision 5 keeps writing those fields, and the harness sends no snapshot, so tool-driven behaviour and scoring are unchanged until the harness learns to send one. When it does, the synthetic "Map changed" message lands in `messages`, which is scored, and the message-based checks need reviewing in that cycle.

**Deleted on the frontend.** `SingleThread`, the first-message `router.replace`, `firstMessageRedirectPath`, `mapTabHref` and `threadHref` (one link builder that preserves the query replaces them), `lastSentContext`, `deriveContext` and `diffUiContext` as senders, the render-time parameter fallbacks in `generateInsights.ts`, the `DATASET_CARDS` tile URL copies, and the map-store writes in replay mode.

## Scope by repo

| Work item                                                                                                                                                                 | Repo                                       | Phase |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----- |
| Persist insight parameters on all three creation paths; return them on `GET /api/insights/{id}` and the list; emit them in the `generate_insights` update                 | project-zeno                               | 0     |
| Parse insight parameters once at the boundary; chips, Analyses pane and dashboards read them; delete the map-state fallbacks                                              | project-zeno-next                          | 0     |
| Layer registry on the catalogue endpoint (tile URL template, date convention, coverage, defaults, context layers)                                                         | project-zeno                               | 0     |
| Camera moves check the map is on screen (`getContainer().isConnected`) and queue until one is, instead of acting on a ref to a removed map                                | project-zeno-next                          | 0     |
| URL schema module (serialise, parse, merge-not-rebuild), store to URL sync through the router, `?thread=` stamping, one cross-surface link builder, index-page reset rule | project-zeno-next                          | 1a    |
| Hydration by reference with the thread-state fallback and URL rewrite; replay mode for tool handlers; chips from the per-turn snapshot                                    | project-zeno-next                          | 1b    |
| Build layers from the registry by id plus parameters; delete the frontend tile URL copies; `pick_dataset` replaces only the previous agent pick                           | project-zeno-next                          | 1b    |
| Typed snapshot in `view_context`; backend diff with clears and one synthetic message; map-page prompt rule for several areas; retire `ui_context` selection slots         | both                                       | 1c    |
| Map share dialog producing the workspace URL; old thread link redirects; 403 on posting to another user's thread                                                          | both                                       | 1d    |
| Remove or honour the `/api/analyze` thread-state promise; fix `replay_chat` dedup                                                                                         | project-zeno                               | 1     |
| GOLD cases ("describe what is on the map", "removal clears the selection", "agent edit then user edit"); harness sends a snapshot; review message-based checks            | gnw-gold-evals / project-zeno `evals/gold` | 1     |
| Manual parameter editing for layers (re-fetch) and analyses (re-run, new id replaces old in the URL)                                                                      | both                                       | 2     |

## Phasing

**Phase 0, prerequisites.** Insight parameters persisted and read (the PZB-992 fix), the layer registry (PZB-1345), and the camera guard. Each is a standalone bug fix with an additive contract and stands on its own if the rest of this ADR changes.

**Phase 1, the decoupling,** in four slices that ship separately and are each backward compatible: 1a URL schema and thread parameter; 1b hydration by reference; 1c snapshot per turn; 1d map sharing and redirects. Gates per the workspace playbook: backend `uv run pytest tests/unit tests/api` and pre-commit; frontend `pnpm test && pnpm test:arch && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build`; a local end-to-end demo of "pick an area in chat, add a catalogue layer by hand, hide the agent's layer, reload, share the link, open it in another browser, continue the conversation on a dashboard and come back"; and the GOLD before/after run with the same trials, profile and environment on both sides.

**Side investigation, the parameter bug.** The root cause is in Appendix A and the fix is Phase 0; PZB-992 is to be updated with it.

**Phase 2, manual editing of layers and analyses.** Controls to change a layer's parameters and re-fetch it through the registry, and to change an analysis's parameters and re-run it; the new insight id replaces the old one in the URL and the old insight stays in the database. Both go through the same store-to-URL updater, so the agent sees them in the next snapshot. Depends on Phase 0 and 1b. Related: PZB-1437 legend parameter pills, PZB-1458 and PZB-1459 analysis parameters and method questions.

## Risks

| Risk                                                                                                                      | Mitigation                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL length. A busy map runs to several hundred characters; a GADM id is about ten, a UUID thirty-six.                     | Short parameter codes, a cap on items with a visible "not all of this map fits in the link" message, and short links deferred to alternative A if needed. Budget: under 2,000 characters.                                                 |
| Reversing "no eager hydration" makes a crowded map ambiguous: two visible areas, which one is "here"?                     | All visible areas become the selection; the map page prompt tells the agent to ask when a question needs one. Dashboards are untouched.                                                                                                   |
| `statistics` accumulates: after the user removes a dataset, the analyst still sees its pulls.                             | The session block names the current dataset and the analyst prompt prefers it; if that proves insufficient, filter `statistics` by the current dataset in `generate_insights`.                                                            |
| Checkpoint and transcript growth from a snapshot per turn, re-emitted by `replay_chat` whenever it changes.               | Keep the snapshot to ids, names and parameters; `inspect_view_context` renders a summary, not the raw dump.                                                                                                                               |
| A referenced thing is not readable by the recipient: a private insight, or a custom area whose name is listed owner-only. | Decision 7 keeps analyses out of map links. Custom areas: geometry is fetchable by any signed-in user, the name is not; either the link carries the name or custom areas are excluded from shared links (product question).               |
| Query parameters are easier to drop than path segments; `?ff` was lost this way before.                                   | Merge-not-rebuild in the one URL module, with a unit test that every known parameter survives a workspace change and a thread stamp. `agent_profile` is already persisted in `localStorage` and does not depend on the URL after capture. |
| The agent's own edits are mistaken for user edits and generate noise.                                                     | The diff compares against state the tools already wrote; a matching snapshot produces no message. Unit tests on the pure diff.                                                                                                            |
| Multi-tab: two tabs on one thread hold different workspaces.                                                              | Same as today for the conversation; each tab's URL is that tab's truth. Document, do not solve.                                                                                                                                           |
| Dashboard behaviour change: no map selection reaches the agent from a dashboard once `ui_context` is retired.             | Intended, and consistent with the dashboard's reference semantics; call it out in the release notes and watch the dashboard GOLD cases.                                                                                                   |
| `/app/classic` still mounts the old layout.                                                                               | Out of scope; it reads the same stores and keeps working. Remove separately if unused.                                                                                                                                                    |

## Open questions

1. **Product: what does a shared map carry?** Proposed: layers, areas, viewport and dates only; analyses are shared through conversations and dashboards. Confirm, and decide whether custom areas appear in shared links and how their name travels.
2. **Snapshot channel A or B** (decision 5). Proposed A; the backend owners decide on invasiveness for the first slice.
3. **Selection rules** (decision 5): all visible areas as one selection, and the topmost dataset layer as the dataset. Confirm or choose another rule.
4. **`pick_dataset` replace rule** (decision 6): replace only the agent's previous pick. Confirm.
5. **Is the pinned date range its own field,** or only a layer parameter? Proposed: its own field, because it also drives direct analyses and is what the user set.
6. **Grammar details and limits:** the item cap, the parameter codes, and whether `view` is centre plus zoom or a bounding box.
7. **Should the map store clear when the user leaves the map?** Proposed: no; the Map tab returns to the last map URL, which carries the workspace.
8. **Analytics:** which GTM page events key on the thread path, and what replaces them.

## Appendix A: evidence for the Context section

File paths are relative to each repo; frontend at project-zeno-next `develop` `a65aec98`, backend at project-zeno `main` `69fba963`.

**Routing and lifecycle.** Routes in `src/app/routes.tsx`: `/app` mounts `NewThread`, `/app/threads/:id` mounts `SingleThread`, and the layout keeps the map mounted between them. `NewThread` resets the chat and map stores and seeds the default tree cover loss layer on every mount, and submits `?prompt=` whenever no thread is current (`app/app/(chat)/page.tsx`). `SingleThread` resets and replays unless the store already holds the thread id (`app/app/(chat)/threads/[id]/page.tsx`). The first message rewrites the URL to the thread route and keeps only `?ff` (`app/utils/threadNavigation.ts`); `mapTabHref` in the same file drops `?ff`. The shared router wrapper exposes `navigate` only (`src/shared/lib/router/index.tsx`).

**Replay.** `chatStore.fetchThread` streams `GET /api/threads/:id` through the live pipeline. Human lines carry `aoi`, `aoi_selection`, `start_date` and `end_date` but not `dataset_selected` (`app/lib/parse-stream-message.ts`); `pickDatasetTool` removes every layer with a `datasetId` before adding the new one (`app/store/chat-tools/pickDataset.ts`); the area handler adds its chat card only after an awaited geometry fetch (`app/store/chat-tools/pickAoi.ts`). Analyze-flow results go to `insightStore` only (`src/features/analysis/ui/use-analysis.ts`); `POST /api/analyze` documents a thread-state write that no code performs (`src/api/routers/analyze.py`, `src/api/services/analysis_job.py`). `replay_chat` de-duplicates each state value against every value emitted earlier (`src/api/services/chat.py`).

**Agent awareness.** `deriveContext` and `diffUiContext` in `app/utils/messageContext.ts`; the slot handling and overwrite in `stream_chat` (`src/api/services/chat.py`); `AgentState` channels in `src/agent/state.py` (`statistics` is `operator.add`); the `ViewContext` models in `src/api/schemas.py`; the rule in `docs/view-context-pages.md` and `src/agent/view_pages.py`; `inspect_view_context` lists layers and areas by name (`src/agent/tools/inspect_view_context.py`). Context chips are `message.context`, built by `deriveContext` at send time and from the replayed map on load (`app/store/chatStore.ts`, `app/components/MessageBubble.tsx`).

**Dashboard to map.** `mapStore.mapRef` is set on load and never cleared (`app/components/Map.tsx`, `app/store/mapStore.ts`). With no ref (a dashboard opened cold) the fly-to helpers warn or, after retries, toast "The map failed to load properly"; with a stale ref they call `fitBoundsClear` on a removed map. `docs/review-lessons.md` already prescribes checking `getContainer().isConnected`.

**Sharing.** `app/components/ThreadShareDialog.tsx` copies `/app/threads/:id`; `PATCH /api/threads/{id}` sets `is_public`; `POST /api/chat` looks the thread up by id and user and otherwise inserts a new row with the same id (`src/api/routers/chat.py`).

**Parameters (PZB-992 root cause).** `InsightOrm` stores text, follow-ups, `statistics_ids`, code parts and `is_public`; `InsightChartOrm` stores a `dataset_id` per chart; `StatisticsOrm` stores dataset, area ids, names and sources, clamped dates, context layer and explicit parameters (`src/api/data_models.py`), is written only by `pull_data`, has no API, lists every pull of the thread on an insight, and does not record the default canopy threshold the analytics handler sends (`src/agent/datasets/handlers/analytics_handler.py`). `/api/analyze` and template insights persist no statistics (`src/api/repositories/job_repository.py`, `dashboard_writer.py`). On the frontend, `generateInsights.ts` builds `analysisParams` from the stream's `aoi_selection` and `dataset`, else from the first visible area layer and dataset layer, and the years from `streamMessage.start_date`, else the dataset layer's dates, else `chatStore.dateRange`; the tool-line parser never forwards dates and the backend's `generate_insights` update has none (`src/agent/subagents/analyst/tool.py`), so that fallback is dead. Stored insights are re-read without parameters (`src/features/insights-history/api/rest-insights-gateway.ts`, `src/features/dashboards/lib/widgets.ts`). Context layer and threshold are never persisted or shown.

**Layers (PZB-1345).** Catalogue cards append `start_year` and `end_year` to their own tile URL copy (`app/utils/datasetCardLayerContext.ts`); the agent's `tile_url` is used verbatim (`pickDataset.ts`); `Layer.startDate`, `endDate` and `parameters` are legend metadata and `DynamicTileLayers` renders `tileUrl` only (`app/components/map/layers/DynamicTileLayers.tsx`). The catalogue endpoint on `main` returns palettes only (`src/api/routers/metadata.py`); project-zeno #819 and #820 were closed on 2026-09-16.

## Appendix B: verification

Three read-only code surveys (frontend routing and hydration; frontend analyses and parameters; backend contracts and persistence) were run on 2026-10-23, their decisive citations re-read by hand, and the draft was reviewed against the code by a fourth pass whose findings are folded in. Jira: PZB-1073, PZB-1483, PZB-992, PZB-1138, PZB-1345, PZB-1538. The workspace wiki pages `docs/contracts.md` and `docs/product-state.md` were audited on 2026-10-21 at the same commits.
