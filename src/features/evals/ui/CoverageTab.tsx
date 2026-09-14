"use client";

/**
 * Case-store coverage for a set: what the cases contain and which buckets
 * their implied checks reach — rendered from the committed coverage.json
 * (COVERAGE.md as data), independent of any run. Known gaps lead the page;
 * counts use the same ROBUST / THIN / GAP categorical language as the
 * coverage matrix (floor of 3, the audit coverage floor).
 */

import { Badge, Flex, SimpleGrid, Table, Text } from "@chakra-ui/react";
import { BUCKETS } from "../model/config";
import { fmtPct } from "../lib/format";
import { matrixCategory } from "../lib/matrix";
import type { EvalSet } from "../model/types";
import { CategoryBadge } from "./charts/CoverageMatrixGrid";
import { ChartCard } from "./primitives/ChartCard";
import { KpiCard } from "./primitives/KpiCard";
import { QueryState } from "./primitives/QueryState";
import { SetSwitcher } from "./primitives/SetSwitcher";
import { useCoverage } from "./use-evals-data";

/** Categorise a plain count with the matrix rules (0 gap, 1-2 thin, 3+ robust). */
function countBadge(count: number, title?: string) {
  return (
    <CategoryBadge
      category={matrixCategory({ dedicated: count, sharedOnly: 0 }, 1)}
      count={count}
      title={title}
    />
  );
}

interface CoverageTabProps {
  readonly set: EvalSet;
  readonly onSetChange: (set: EvalSet) => void;
}

export function CoverageTab({ set, onSetChange }: CoverageTabProps) {
  const coverage = useCoverage(set);
  const doc = coverage.data;

  return (
    <Flex direction="column" gap={4}>
      <SetSwitcher value={set} onChange={onSetChange} />
      <QueryState
        isLoading={coverage.isLoading}
        error={coverage.error as Error | null}
        what="the coverage document"
      />
      {doc ? (
        <>
          <ChartCard
            title="Known gaps"
            description="What this case store cannot see today. Anything listed here is a blind spot: failures of these kinds would go unmeasured until cases are authored or checks re-admitted."
          >
            <Flex direction="column" gap={2} fontSize="sm">
              <Text>
                <Text as="span" fontWeight="semibold">
                  Unused expected fields:
                </Text>{" "}
                {doc.knownGaps.unusedExpectedFields.join(", ") || "none"}
              </Text>
              <Text>
                <Text as="span" fontWeight="semibold">
                  Info-only checks (reported, never gating):
                </Text>{" "}
                {doc.knownGaps.infoOnlyChecks.join(", ") || "none"}
              </Text>
              <Text>
                <Text as="span" fontWeight="semibold">
                  Catalog datasets with no active case:
                </Text>{" "}
                {doc.knownGaps.catalogDatasetsNoCase.join(", ") || "none"}
              </Text>
              {Object.keys(doc.knownGaps.uncoveredParameters).length ? (
                <Text>
                  <Text as="span" fontWeight="semibold">
                    Unexercised parameters:
                  </Text>{" "}
                  {Object.entries(doc.knownGaps.uncoveredParameters)
                    .map(([name, ids]) => `${name} (${ids.join(", ")})`)
                    .join("; ")}
                </Text>
              ) : null}
              {Object.keys(doc.knownGaps.uncoveredContextLayers).length ? (
                <Text>
                  <Text as="span" fontWeight="semibold">
                    Unexercised context layers:
                  </Text>{" "}
                  {Object.entries(doc.knownGaps.uncoveredContextLayers)
                    .map(([name, ids]) => `${name} (${ids.join(", ")})`)
                    .join("; ")}
                </Text>
              ) : null}
            </Flex>
          </ChartCard>

          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
            <KpiCard
              label="Cases"
              value={`${doc.caseCount}`}
              hint={Object.entries(doc.statuses)
                .map(([status, count]) => `${status} ${count}`)
                .join(" · ")}
            />
            <KpiCard label="Active" value={`${doc.activeCount}`} />
            <KpiCard
              label="Caseset version"
              value={doc.casesetVersion.slice(0, 8)}
              hint="runs recorded against older versions join by uid"
            />
            <KpiCard
              label="Multi-turn"
              value={`${doc.multiTurn.conversations}`}
              hint={`${doc.multiTurn.turns} turns`}
            />
          </SimpleGrid>

          {doc.targets ? (
            <ChartCard
              title="Targets"
              description={`From TARGETS.yml${doc.targets.meta.status ? ` (${doc.targets.meta.status})` : ""}.`}
            >
              <Flex gap={2} wrap="wrap">
                <Badge colorPalette="blue" variant="subtle">
                  overall {fmtPct(doc.targets.overall, 0)}
                </Badge>
                {Object.entries(doc.targets.sets).flatMap(
                  ([setName, block]) => [
                    ...(block.overall !== null
                      ? [
                          <Badge
                            key={setName}
                            colorPalette="blue"
                            variant="outline"
                          >
                            {setName} {fmtPct(block.overall, 0)}
                          </Badge>,
                        ]
                      : []),
                    ...Object.entries(block.targets).map(([cohort, target]) => (
                      <Badge
                        key={`${setName}-${cohort}`}
                        colorPalette="gray"
                        variant="outline"
                      >
                        {setName}/{cohort} {fmtPct(target, 0)}
                      </Badge>
                    )),
                  ]
                )}
              </Flex>
            </ChartCard>
          ) : null}

          <ChartCard
            title="Bucket coverage (active cases)"
            description="How many active cases can reach each failure dimension through a dedicated gating check. Shared-only cases can be measured but their failures cannot be attributed to the bucket."
          >
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>bucket</Table.ColumnHeader>
                  <Table.ColumnHeader>coverage</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">
                    dedicated
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">
                    shared-only
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">
                    of active
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {BUCKETS.map((bucket) => {
                  const cov = doc.bucketCoverage[bucket];
                  const total = cov.dedicated + cov.sharedOnly;
                  return (
                    <Table.Row key={bucket}>
                      <Table.Cell fontFamily="mono" fontSize="xs">
                        {bucket}
                      </Table.Cell>
                      <Table.Cell>
                        <CategoryBadge
                          category={matrixCategory(
                            {
                              dedicated: cov.dedicated,
                              sharedOnly: cov.sharedOnly,
                            },
                            doc.activeCount
                          )}
                          count={total}
                        />
                      </Table.Cell>
                      <Table.Cell textAlign="end">{cov.dedicated}</Table.Cell>
                      <Table.Cell textAlign="end">{cov.sharedOnly}</Table.Cell>
                      <Table.Cell textAlign="end">
                        {doc.activeCount
                          ? fmtPct(total / doc.activeCount, 0)
                          : "–"}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </ChartCard>

          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
            <ChartCard
              title="Groups"
              description="Active cases per group; the badge applies the coverage floor to the group's active count."
            >
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>group</Table.ColumnHeader>
                    <Table.ColumnHeader>active</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">
                      cases
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>statuses</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {doc.groups.map((group) => (
                    <Table.Row key={group.group}>
                      <Table.Cell fontFamily="mono" fontSize="xs">
                        {group.group}
                      </Table.Cell>
                      <Table.Cell>{countBadge(group.active)}</Table.Cell>
                      <Table.Cell textAlign="end">{group.cases}</Table.Cell>
                      <Table.Cell fontSize="xs" color="fg.subtle">
                        {Object.entries(group.statuses)
                          .map(([status, count]) => `${status} ${count}`)
                          .join(", ")}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </ChartCard>

            <ChartCard
              title="Expected-field census"
              description="Which expectations the active cases set, and the checks each field switches on. A GAP field means its checks can never fire."
            >
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>field</Table.ColumnHeader>
                    <Table.ColumnHeader>cases</Table.ColumnHeader>
                    <Table.ColumnHeader>switches on</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {doc.expectedFields.map((field) => (
                    <Table.Row key={field.field}>
                      <Table.Cell fontFamily="mono" fontSize="xs">
                        {field.field}
                      </Table.Cell>
                      <Table.Cell>{countBadge(field.cases)}</Table.Cell>
                      <Table.Cell fontSize="xs" color="fg.subtle">
                        {field.switchesOn}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </ChartCard>
          </SimpleGrid>

          {doc.datasetCoverage ? (
            <ChartCard
              title="Dataset coverage (project-zeno catalog)"
              description={
                (doc.datasetCoverage.source
                  ? `Catalog snapshot project-zeno@${doc.datasetCoverage.source.sha.slice(0, 7)}, synced ${doc.datasetCoverage.source.synced}. `
                  : "") +
                "Cases per catalog dataset; answer-graded cases are the ones that exercise a dataset's prompt and presentation instructions. GAP badges and ×0 features are coverage holes."
              }
            >
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>id</Table.ColumnHeader>
                    <Table.ColumnHeader>dataset</Table.ColumnHeader>
                    <Table.ColumnHeader>cases</Table.ColumnHeader>
                    <Table.ColumnHeader>answer-graded</Table.ColumnHeader>
                    <Table.ColumnHeader>parameters</Table.ColumnHeader>
                    <Table.ColumnHeader>context layers</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {doc.datasetCoverage.datasets.map((dataset) => (
                    <Table.Row key={dataset.datasetId}>
                      <Table.Cell>{dataset.datasetId}</Table.Cell>
                      <Table.Cell fontSize="xs">
                        {dataset.datasetName}
                        {dataset.missingInstructions.length > 0 ? (
                          <Text as="span" color="fg.subtle">
                            {" "}
                            (missing: {dataset.missingInstructions.join(", ")})
                          </Text>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell>{countBadge(dataset.cases)}</Table.Cell>
                      <Table.Cell>
                        {countBadge(dataset.answerGraded)}
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {dataset.parameters.length
                          ? dataset.parameters.map((parameter, index) => (
                              <Text
                                as="span"
                                key={parameter.name}
                                color={
                                  parameter.cases === 0 ? "red.fg" : "fg.subtle"
                                }
                              >
                                {index > 0 ? ", " : ""}
                                {parameter.name} ×{parameter.cases}
                              </Text>
                            ))
                          : "–"}
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {dataset.contextLayers.length
                          ? dataset.contextLayers.map((layer, index) => (
                              <Text
                                as="span"
                                key={layer.name}
                                color={
                                  layer.cases === 0 ? "red.fg" : "fg.subtle"
                                }
                              >
                                {index > 0 ? ", " : ""}
                                {layer.name} ×{layer.cases}
                              </Text>
                            ))
                          : "–"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </ChartCard>
          ) : null}
        </>
      ) : null}
    </Flex>
  );
}
