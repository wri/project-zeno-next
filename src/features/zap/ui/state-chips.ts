import { DATASET_BY_ID } from "@/app/constants/datasets";

import type { ZapCurrent } from "../model/zap-plan";

/** The period as years when it holds whole years, else as dates. */
function periodLabel(start: string, end: string): string {
  if (start.endsWith("-01-01") && end.endsWith("-12-31")) {
    const [from, to] = [start.slice(0, 4), end.slice(0, 4)];
    return from === to ? from : `${from}–${to}`;
  }
  return `${start} – ${end}`;
}

/** The chips of a trail row: dataset, area, period, forest type, canopy. */
export function stateChips(state: ZapCurrent): string[] {
  const chips: string[] = [];
  if (typeof state.dataset_id === "number") {
    chips.push(
      DATASET_BY_ID[state.dataset_id]?.dataset_name ??
        `Dataset ${state.dataset_id}`
    );
  }
  if (state.area) chips.push(state.area.name.split(",")[0]);
  if (state.start_date && state.end_date) {
    chips.push(periodLabel(state.start_date, state.end_date));
  }
  if (state.context_layer) chips.push(state.context_layer.replace(/_/g, " "));
  if (typeof state.canopy_cover === "number") {
    chips.push(`≥${state.canopy_cover}% canopy`);
  }
  return chips;
}
