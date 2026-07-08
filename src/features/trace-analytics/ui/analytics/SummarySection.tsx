"use client";

import { useMemo, useState } from "react";
import { Box, Button, Flex, Heading, Table, Text } from "@chakra-ui/react";
import {
  ClipboardTextIcon,
  CopyIcon,
  DownloadSimpleIcon,
  TableIcon,
} from "@phosphor-icons/react";
import type { TraceRow } from "../../model/types";
import type { ReportContext } from "../../lib/analytics/report";
import {
  buildSlackSummary,
  buildSummaryTable,
} from "../../lib/analytics/report";
import { formatReportDate, inclusiveDays } from "../../lib/format";
import { downloadText, toCsv } from "../../lib/csv";
import { Expander } from "../primitives/Expander";

interface SummarySectionProps {
  readonly context: ReportContext;
  readonly rows: readonly TraceRow[];
  readonly baseThreadUrl: string;
  /** Override the section heading (defaults to "Summary Statistics (…)"). */
  readonly heading?: string;
}

export function SummarySection({
  context,
  rows,
  baseThreadUrl,
  heading,
}: SummarySectionProps) {
  const [copied, setCopied] = useState(false);
  const slackSummary = useMemo(() => buildSlackSummary(context), [context]);
  const tableRows = useMemo(() => buildSummaryTable(context), [context]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(slackSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — user can select text.
    }
  }

  function downloadReportCsv() {
    const csvRows = rows.map((row) => ({
      ...row,
      url: row.sessionId ? `${baseThreadUrl}/${row.sessionId}` : "",
    }));
    downloadText(toCsv(csvRows), "stats_report_rows.csv");
  }

  const days = inclusiveDays(context.startDate, context.endDate);

  return (
    <Box>
      <Heading as="h3" size="md" mb={3}>
        {heading ??
          `Summary Statistics (${days} days: ${formatReportDate(context.startDate)} to ${formatReportDate(context.endDate)})`}
      </Heading>

      <Flex direction="column" gap={3}>
        <Expander
          title="Copy summary for Slack"
          icon={<ClipboardTextIcon size={16} />}
        >
          <Button size="xs" variant="outline" mb={2} onClick={copySummary}>
            <CopyIcon />
            {copied ? "Copied!" : "Copy to clipboard"}
          </Button>
          <Box
            as="pre"
            fontFamily="mono"
            fontSize="xs"
            whiteSpace="pre-wrap"
            bg="bg.subtle"
            p={3}
            borderRadius="md"
          >
            {slackSummary}
          </Box>
        </Expander>

        <Expander
          title="Full metric table (with definitions)"
          icon={<TableIcon size={16} />}
        >
          <Box overflowX="auto">
            <Table.Root size="sm" striped>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Section</Table.ColumnHeader>
                  <Table.ColumnHeader>Metric</Table.ColumnHeader>
                  <Table.ColumnHeader>Value</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {tableRows.map((row) => (
                  <Table.Row key={`${row.section}-${row.metric}`}>
                    <Table.Cell>
                      <Text fontSize="xs" color="fg.muted">
                        {row.section}
                      </Text>
                    </Table.Cell>
                    <Table.Cell fontWeight="medium">{row.metric}</Table.Cell>
                    <Table.Cell fontFamily="mono">{row.value}</Table.Cell>
                    <Table.Cell>
                      <Text fontSize="xs" color="fg.muted">
                        {row.description}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Expander>

        <Box>
          <Button size="sm" variant="outline" onClick={downloadReportCsv}>
            <DownloadSimpleIcon />
            Download report data .csv ({rows.length.toLocaleString()} rows)
          </Button>
        </Box>
      </Flex>
    </Box>
  );
}
