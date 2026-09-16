"use client";

/**
 * Evals screen: Overview, Trends, Runs and Coverage as URL-synced tabs on
 * one route (`/evals?tab=…&set=…&run=…`), so deep links survive sharing.
 *
 * The superuser gate lives in the route page and is UX-only — the data is
 * the public gnw-gold-evals repo, fetched straight from GitHub raw.
 */

import { Box, Tabs } from "@chakra-ui/react";
import {
  ChartLineUpIcon,
  ExamIcon,
  ListChecksIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EvalSet } from "../model/types";
import { EVALS_DATA_BRANCH } from "../api/github";
import { CoverageTab } from "./CoverageTab";
import { OverviewTab } from "./OverviewTab";
import { RunsTab } from "./RunsTab";
import { TrendsTab } from "./TrendsTab";
import { InlineAlert } from "./primitives/InlineAlert";
import { isEvalSet, isEvalsTab, tabHref, type EvalsTab } from "./links";

export function EvalsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams?.get("tab") ?? null;
  const activeTab: EvalsTab = isEvalsTab(tabParam) ? tabParam : "overview";
  const setParam = searchParams?.get("set") ?? null;
  const activeSet: EvalSet = isEvalSet(setParam) ? setParam : "gold";
  const runParam = searchParams?.get("run") ?? null;

  function navigate(
    tab: EvalsTab,
    params: Readonly<Record<string, string | undefined>> = {}
  ) {
    router.replace(tabHref(tab, params), { scroll: false });
  }

  function handleTabChange(details: { value: string }) {
    if (!isEvalsTab(details.value)) return;
    // Keep the set selection across tabs; drop the run deep link.
    navigate(details.value, { set: setParam ?? undefined });
  }

  return (
    <Box p={{ base: 4, lg: 6 }} maxW="1560px">
      <Box mb={4}>
        <InlineAlert
          status="info"
          title="Reads the public gnw-gold-evals ledger"
          message={`Data comes from committed artefacts on branch "${EVALS_DATA_BRANCH}" of github.com/wri/gnw-gold-evals, cached ~5 minutes by GitHub raw. New runs appear once they are pushed.`}
        />
      </Box>

      <Tabs.Root
        value={activeTab}
        onValueChange={handleTabChange}
        lazyMount
        variant="enclosed"
      >
        <Tabs.List mb={4}>
          <Tabs.Trigger value="overview">
            <ExamIcon size={16} />
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger value="trends">
            <ChartLineUpIcon size={16} />
            Trends
          </Tabs.Trigger>
          <Tabs.Trigger value="runs">
            <ListChecksIcon size={16} />
            Runs
          </Tabs.Trigger>
          <Tabs.Trigger value="coverage">
            <TargetIcon size={16} />
            Coverage
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <OverviewTab
            set={activeSet}
            onSetChange={(nextSet) => navigate("overview", { set: nextSet })}
          />
        </Tabs.Content>
        <Tabs.Content value="trends">
          <TrendsTab
            set={activeSet}
            onSetChange={(set) => navigate("trends", { set })}
            onOpenRun={(runId) =>
              navigate("runs", { set: activeSet, run: runId })
            }
          />
        </Tabs.Content>
        <Tabs.Content value="runs">
          <RunsTab
            set={activeSet}
            onSetChange={(set) => navigate("runs", { set })}
            runId={runParam}
            onRunChange={(runId) =>
              navigate("runs", { set: activeSet, run: runId })
            }
          />
        </Tabs.Content>
        <Tabs.Content value="coverage">
          <CoverageTab
            set={activeSet}
            onSetChange={(set) => navigate("coverage", { set })}
          />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}
