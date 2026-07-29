"use client";

/** Shared fetch filters (date window, environment, internal-user exclusion). */

import { create } from "zustand";
import { EARLIEST_DATA_DATE, type EnvironmentOption } from "./config";
import { shiftIsoDate, todayIso } from "./dates";

export const DATE_PRESETS = [
  "Custom",
  "Last day",
  "Last 3 days",
  "Last week",
  "Last 2 weeks",
  "Last month",
  "Last 6 weeks",
  "All time",
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

const PRESET_DAYS: Readonly<
  Record<Exclude<DatePreset, "Custom" | "All time">, number>
> = {
  "Last day": 1,
  "Last 3 days": 3,
  "Last week": 7,
  "Last 2 weeks": 14,
  "Last month": 30,
  "Last 6 weeks": 42,
};

export function presetRange(preset: Exclude<DatePreset, "Custom">): {
  startDate: string;
  endDate: string;
} {
  const endDate = todayIso();
  if (preset === "All time") {
    return { startDate: EARLIEST_DATA_DATE, endDate };
  }
  return { startDate: shiftIsoDate(endDate, -PRESET_DAYS[preset]), endDate };
}

/**
 * Unit of analysis for the Analytics view: individual turns (one trace = one
 * user prompt, the default) or whole conversations (turns aggregated per
 * session client-side, see lib/analytics/conversationGrain.ts).
 */
export type AnalysisGrain = "turn" | "conversation";

interface FiltersState {
  readonly preset: DatePreset;
  readonly startDate: string;
  readonly endDate: string;
  readonly environment: EnvironmentOption;
  readonly excludeInternal: boolean;
  readonly grain: AnalysisGrain;
  readonly setPreset: (preset: DatePreset) => void;
  readonly setCustomRange: (startDate: string, endDate: string) => void;
  readonly setEnvironment: (environment: EnvironmentOption) => void;
  readonly setExcludeInternal: (exclude: boolean) => void;
  readonly setGrain: (grain: AnalysisGrain) => void;
}

const initialRange = presetRange("Last week");

export const useFiltersStore = create<FiltersState>()((set) => ({
  preset: "Last week",
  startDate: initialRange.startDate,
  endDate: initialRange.endDate,
  environment: "production",
  excludeInternal: true,
  grain: "turn",
  setPreset: (preset) => {
    if (preset === "Custom") {
      set({ preset });
      return;
    }
    set({ preset, ...presetRange(preset) });
  },
  setCustomRange: (startDate, endDate) =>
    set({ preset: "Custom", startDate, endDate }),
  setEnvironment: (environment) => set({ environment }),
  setExcludeInternal: (excludeInternal) => set({ excludeInternal }),
  setGrain: (grain) => set({ grain }),
}));
