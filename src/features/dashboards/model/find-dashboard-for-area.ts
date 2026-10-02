import type { Dashboard } from "../api/schemas";

/** The AOI identity a map selection carries into the exists-check. */
export interface DashboardAreaKey {
  source: string;
  srcId: string;
  name: string;
}

/**
 * The dashboard that already covers an area, or null.
 *
 * A dashboard is scoped to exactly one AOI, so "does a dashboard exist for this
 * area?" is a lookup over `dashboard.aois`. Two rungs, in order:
 *
 *  1. `source` + `src_id` — the stable identity, and the only match that can't
 *     produce a false positive.
 *  2. `name`, case-insensitively — the fallback for dashboards created before
 *     an id was recorded, and for AOIs whose source vocabulary drifted. Scoped
 *     to the same source so a protected area never matches an admin area that
 *     happens to share a name.
 *
 * An id match always wins over a name match, even a more recent one: the id is
 * evidence, the name is a guess. Within a rung the most recently updated
 * dashboard wins, so the nudge opens the one the user last worked in.
 */
export function findDashboardForArea(
  dashboards: Dashboard[],
  area: DashboardAreaKey
): Dashboard | null {
  const source = area.source.toLowerCase();
  const name = area.name.trim().toLowerCase();

  const byId: Dashboard[] = [];
  const byName: Dashboard[] = [];

  for (const dashboard of dashboards) {
    for (const aoi of dashboard.aois) {
      if (aoi.source.toLowerCase() !== source) continue;
      if (area.srcId && aoi.src_id === area.srcId) {
        byId.push(dashboard);
        break;
      }
      if (name && aoi.name.trim().toLowerCase() === name) {
        byName.push(dashboard);
        break;
      }
    }
  }

  return mostRecent(byId) ?? mostRecent(byName);
}

/** Latest `updated_at` wins. Unparseable timestamps sort last, not first. */
function mostRecent(dashboards: Dashboard[]): Dashboard | null {
  let best: Dashboard | null = null;
  let bestTime = -Infinity;

  for (const dashboard of dashboards) {
    const parsed = new Date(dashboard.updated_at).getTime();
    const time = isNaN(parsed) ? -Infinity : parsed;
    if (best === null || time > bestTime) {
      best = dashboard;
      bestTime = time;
    }
  }

  return best;
}
