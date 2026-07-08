/** Report text/table builders for the Analytics page (port of analytics.py). */

import type { SummaryStats, PromptUtilisation } from "./aggregations";
import type { UserSegments } from "./segments";
import {
  formatCount,
  formatPercent,
  formatReportDate,
  inclusiveDays,
} from "../format";
import starterPromptsFixture from "../../fixtures/starter-prompts.json";

export const STARTER_PROMPTS: readonly string[] = (
  starterPromptsFixture.prompts ?? []
).filter((p): p is string => typeof p === "string" && p.trim().length > 0);

/** Short labels for known starter prompts (chart legibility). */
export const STARTER_PROMPT_LABELS: Readonly<Record<string, string>> = {
  "Show changes in grassland extent in Montana.": "Grassland change",
  "Analyse forest loss trends in the Rusizi Basin, Rwanda, over the last 10 years.":
    "Forest loss trends",
  "How much of the Democratic Republic of Congo is natural land?":
    "DRC natural land",
  "Show forest loss from wildfires in California over the last five years.":
    "Wildfire forest loss",
  "How much natural land was converted to cropland in Spain last summer?":
    "Cropland conversion",
  "Where in Indonesia have restoration efforts occurred over the past decade?":
    "Restoration areas",
  "What are the trends in natural grassland area in Bolivia since 2015?":
    "Grassland trends",
  "Since 2015 in the US, how much natural land has been converted to other uses?":
    "Land conversion",
  "Compare disturbances in France last month: natural events vs human activity.":
    "Disturbances (FR)",
  "What were the top three causes of tree loss in Brazil last year?":
    "Tree loss causes",
  "Show the biggest changes in land cover in Kenya between 2015 and 2024.":
    "Land cover change",
};

export interface ReportContext {
  readonly startDate: string;
  readonly endDate: string;
  readonly stats: SummaryStats;
  readonly utilisation: PromptUtilisation;
  readonly segments: UserSegments | null;
  readonly totalKnownUsers: number;
}

/** The copy-for-Slack summary block. */
export function buildSlackSummary(ctx: ReportContext): string {
  const { startDate, endDate, stats, utilisation, segments, totalKnownUsers } =
    ctx;
  const startLabel = formatReportDate(startDate);
  const endLabel = formatReportDate(endDate);
  const days = inclusiveDays(startDate, endDate);

  const userLines = segments
    ? [
        `• Total users (all time): ${formatCount(totalKnownUsers)}`,
        "**Acquisition**",
        `• New users (since ${startLabel}): ${formatCount(segments.newUsers.size)}`,
        `• Returning users (since ${startLabel}): ${formatCount(segments.returningUsers.size)}`,
        "**Engagement**",
        `• Engaged users (since ${startLabel}): ${formatCount(segments.engagedUsers.size)}`,
        `• Not engaged users (since ${startLabel}): ${formatCount(segments.notEngagedUsers.size)}`,
        "",
      ].join("\n")
    : "";

  return `📊 *GNW Trace Analytics Report*
📅 ${startLabel} → ${endLabel} (${days} days)

**Volume**
• Total traces (prompts): ${formatCount(stats.totalTraces)}
• Unique threads (convos): ${formatCount(stats.uniqueThreads)}
• Unique users: ${formatCount(stats.uniqueUsers)}
${userLines}**Outcomes**
• Success rate: ${formatPercent(stats.successRate)}
• Defer rate: ${formatPercent(stats.deferRate)}
• Soft error rate: ${formatPercent(stats.softErrorRate)}
• Error rate: ${formatPercent(stats.errorRate)}
• Empty rate: ${formatPercent(stats.emptyRate)}

**Performance**
• Mean cost: $${stats.meanCost.toFixed(4)}
• Median cost: $${stats.medianCost.toFixed(4)}
• p95 cost: $${stats.p95Cost.toFixed(4)}
• Mean latency: ${stats.meanLatency.toFixed(2)}s
• p95 latency: ${stats.p95Latency.toFixed(2)}s

**Prompt utilisation**
• User-days: ${formatCount(utilisation.userDays)}
• Mean prompts/user/day: ${utilisation.meanPrompts.toFixed(2)}
• Median prompts/user/day: ${utilisation.medianPrompts.toFixed(0)}
• p95 prompts/user/day: ${utilisation.p95Prompts.toFixed(0)}`;
}

export interface SummaryTableRow {
  readonly section: string;
  readonly metric: string;
  readonly value: string;
  readonly description: string;
}

/** The summary statistics table shown under the headline. */
export function buildSummaryTable(ctx: ReportContext): SummaryTableRow[] {
  const { startDate, stats, utilisation, segments, totalKnownUsers } = ctx;
  const startLabel = formatReportDate(startDate);

  const rows: SummaryTableRow[] = [
    {
      section: "Volume",
      metric: "Total traces",
      value: formatCount(stats.totalTraces),
      description: "Total number of prompts in the period",
    },
    {
      section: "Volume",
      metric: "Unique threads",
      value: formatCount(stats.uniqueThreads),
      description: "Distinct conversation sessions (multi-turn chats)",
    },
    {
      section: "Volume",
      metric: "Unique users",
      value: formatCount(stats.uniqueUsers),
      description: "Distinct user IDs that made at least one prompt",
    },
  ];

  if (segments) {
    rows.push(
      {
        section: "Volume",
        metric: "Total users (all time)",
        value: formatCount(totalKnownUsers),
        description: "Distinct GNW accounts since launch (from the users API)",
      },
      {
        section: "Acquisition",
        metric: `New users (since ${startLabel})`,
        value: formatCount(segments.newUsers.size),
        description: `Users whose first-ever activity was on or after ${startLabel}`,
      },
      {
        section: "Acquisition",
        metric: `Returning users (since ${startLabel})`,
        value: formatCount(segments.returningUsers.size),
        description: `Users whose first-ever activity was before ${startLabel}`,
      },
      {
        section: "Engagement",
        metric: `Engaged users (since ${startLabel})`,
        value: formatCount(segments.engagedUsers.size),
        description:
          "Users with ≥2 sessions each having ≥2 prompts (new or returning)",
      },
      {
        section: "Engagement",
        metric: `Not engaged users (since ${startLabel})`,
        value: formatCount(segments.notEngagedUsers.size),
        description: "Users not meeting the engagement threshold",
      }
    );
  }

  rows.push(
    {
      section: "Outcomes",
      metric: "Success rate",
      value: formatPercent(stats.successRate),
      description: "% of traces that returned a valid answer",
    },
    {
      section: "Outcomes",
      metric: "Defer rate",
      value: formatPercent(stats.deferRate),
      description:
        "% of traces classified as DEFER (non-empty answer, no tool usage)",
    },
    {
      section: "Outcomes",
      metric: "Soft error rate",
      value: formatPercent(stats.softErrorRate),
      description:
        "% of traces whose answer looks like an error/apology (heuristic)",
    },
    {
      section: "Outcomes",
      metric: "Error rate",
      value: formatPercent(stats.errorRate),
      description:
        "% of traces with an AI message but an empty extracted answer",
    },
    {
      section: "Outcomes",
      metric: "Empty rate",
      value: formatPercent(stats.emptyRate),
      description:
        "% of traces with no AI answer message (failed request or timeout)",
    },
    {
      section: "Performance",
      metric: "Mean cost",
      value: `$${stats.meanCost.toFixed(4)}`,
      description: "Average LLM cost per trace",
    },
    {
      section: "Performance",
      metric: "Median cost",
      value: `$${stats.medianCost.toFixed(4)}`,
      description:
        "Middle value of cost distribution (less sensitive to outliers)",
    },
    {
      section: "Performance",
      metric: "p95 cost",
      value: `$${stats.p95Cost.toFixed(4)}`,
      description: "95th percentile cost (only 5% of traces cost more)",
    },
    {
      section: "Performance",
      metric: "Mean latency",
      value: `${stats.meanLatency.toFixed(2)}s`,
      description: "Mean time from request to response",
    },
    {
      section: "Performance",
      metric: "P95 latency",
      value: `${stats.p95Latency.toFixed(2)}s`,
      description: "95th percentile latency (worst-case for most users)",
    },
    {
      section: "Engagement",
      metric: "User-days",
      value: formatCount(utilisation.userDays),
      description: "Total user × day combinations (one user on 3 days = 3)",
    },
    {
      section: "Engagement",
      metric: "Mean prompts/user/day",
      value: utilisation.meanPrompts.toFixed(2),
      description: "Average number of prompts a user sends per active day",
    },
    {
      section: "Engagement",
      metric: "Median prompts/user/day",
      value: utilisation.medianPrompts.toFixed(0),
      description:
        "Typical prompts per user per day (less skewed by power users)",
    },
    {
      section: "Engagement",
      metric: "p95 prompts/user/day",
      value: utilisation.p95Prompts.toFixed(0),
      description: "Top 5% of users send this many prompts or more per day",
    }
  );

  return rows;
}
