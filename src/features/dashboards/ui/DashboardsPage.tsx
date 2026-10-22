import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ButtonGroup,
  Container,
  Flex,
  Grid,
  Heading,
  IconButton,
  Pagination,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

import { useDashboardAlertsSummary } from "../hooks/useDashboardAlertsSummary";
import { useIntegratedAlertsFreshness } from "../hooks/useIntegratedAlertsFreshness";
import { hasNewAlerts } from "../lib/alerts-summary";
import { byRecentlyUpdated, paginate } from "../lib/pagination";
import DashboardCard from "./DashboardCard";
import DashboardCardSkeleton from "./DashboardCardSkeleton";
import DashboardsAlertsOverview from "./DashboardsAlertsOverview";
import { NewDashboardScreen } from "./NewDashboardScreen";
import { useDashboards } from "./dashboardQueries";

/** Fixed card width from the Figma, mirrored by `DashboardCard`. */
const CARD_WIDTH = 261;
/** Chakra spacing token 4, the grid's `gap`. */
const GRID_GAP = 16;
/** Chakra's container recipe pads by spacing token 8 at `lg` and above. */
const CONTAINER_PADDING = 32;
const COLUMNS = 4;

// The stock 6xl container (1152px) leaves 1088px inside its padding, 4px short
// of the 1092px four columns need, so `auto-fill` silently dropped to three.
// Widening by that margin (plus a few px of slack against sub-pixel rounding)
// is enough; the width is derived so the relationship stays visible if the card
// size or gap ever changes.
const GRID_WIDTH = COLUMNS * CARD_WIDTH + (COLUMNS - 1) * GRID_GAP;
const CONTAINER_MAX_WIDTH = `${GRID_WIDTH + 2 * CONTAINER_PADDING + 4}px`;

// Two full rows, so the last row never goes ragged and "Create new dashboard"
// stays within reach instead of being pushed down a row per handful of
// dashboards.
const PAGE_SIZE = COLUMNS * 2;

// The cards wait for their alerts so the page appears in one go, but the
// summary rides on an analytics job the backend polls for minutes, so past
// this the cards show and the badges and the line above them fill in.
const ALERTS_WAIT_MS = 3000;

/** False until `ms` after mount, then true. */
function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return elapsed;
}

export default function DashboardsPage() {
  const { data: dashboards = [], isLoading, isError } = useDashboards();
  const [requestedPage, setRequestedPage] = useState(1);

  const ordered = useMemo(
    () => [...dashboards].sort(byRecentlyUpdated),
    [dashboards]
  );

  // One summary for every dashboard the user has, not just the page on show:
  // the "n of m" line counts across all of them, and the list endpoint has
  // already returned them all.
  const dashboardIds = useMemo(() => ordered.map((d) => d.id), [ordered]);
  const { data: alertsSummary, isLoading: alertsLoading } =
    useDashboardAlertsSummary(dashboardIds);
  const { data: alertsFreshness, isLoading: freshnessLoading } =
    useIntegratedAlertsFreshness();
  const alertsWaitOver = useElapsed(ALERTS_WAIT_MS);
  // A failed request settles like a loaded one, so errors never hold the page.
  const showCardSkeletons =
    isLoading || ((alertsLoading || freshnessLoading) && !alertsWaitOver);

  // `page` is the clamped result, not `requestedPage`, because a delete can
  // shrink the list out from under the held page number.
  const { items, page, totalPages } = paginate(
    ordered,
    requestedPage,
    PAGE_SIZE
  );

  return (
    <Box bg="#F4F5F6" minH="calc(100vh - 40px)" py={{ base: 8, md: 14 }}>
      <Container maxW={CONTAINER_MAX_WIDTH}>
        <Flex direction="column" gap={12}>
          <Box>
            <Box mb={6}>
              <Heading as="h1" size="lg" fontWeight="normal" mb={0}>
                My dashboards
              </Heading>
              {(isLoading || ordered.length > 0) && (
                <DashboardsAlertsOverview
                  summary={alertsSummary}
                  dashboardIds={dashboardIds}
                  freshness={alertsFreshness}
                  loading={isLoading || alertsLoading || freshnessLoading}
                />
              )}
            </Box>
            {isError ? (
              <Text color="fg.error">Could not load dashboards.</Text>
            ) : !isLoading && ordered.length === 0 ? (
              <Box
                bg="white"
                borderWidth="1px"
                borderColor="border"
                borderRadius="sm"
                p={6}
              >
                <Text color="fg.muted">
                  You have no dashboards yet. Search for an area below to create
                  one, or ask the Assistant to help you get started.
                </Text>
              </Box>
            ) : (
              <>
                {showCardSkeletons && (
                  <VisuallyHidden>Loading dashboards...</VisuallyHidden>
                )}
                {/* Fixed-width cards per the Figma; as many as fit per row. */}
                <Grid
                  aria-busy={showCardSkeletons}
                  templateColumns={{
                    base: "1fr",
                    sm: `repeat(auto-fill, ${CARD_WIDTH}px)`,
                  }}
                  gap={`${GRID_GAP}px`}
                >
                  {showCardSkeletons
                    ? // One row until the list arrives, then one per card on
                      // the page, so the grid keeps its size on reveal.
                      Array.from(
                        { length: isLoading ? COLUMNS : items.length },
                        (_, i) => <DashboardCardSkeleton key={i} />
                      )
                    : items.map((dashboard) => (
                        <DashboardCard
                          key={dashboard.id}
                          dashboard={dashboard}
                          alertsLoading={alertsLoading}
                          hasNewAlerts={
                            alertsSummary
                              ? hasNewAlerts(alertsSummary, dashboard.id)
                              : false
                          }
                        />
                      ))}
                </Grid>

                {!showCardSkeletons && totalPages > 1 && (
                  <Pagination.Root
                    count={ordered.length}
                    pageSize={PAGE_SIZE}
                    page={page}
                    onPageChange={(e) => setRequestedPage(e.page)}
                    mt={6}
                  >
                    <Flex align="center" justify="space-between" gap={4}>
                      <Pagination.PageText
                        format="long"
                        fontSize="xs"
                        color="fg.muted"
                      />
                      <ButtonGroup variant="ghost" size="sm">
                        <Pagination.PrevTrigger asChild>
                          <IconButton aria-label="Previous page">
                            <CaretLeftIcon />
                          </IconButton>
                        </Pagination.PrevTrigger>
                        <Pagination.Items
                          render={(pageItem) => (
                            <IconButton
                              variant={
                                pageItem.value === page ? "outline" : "ghost"
                              }
                              aria-label={`Page ${pageItem.value}`}
                            >
                              {pageItem.value}
                            </IconButton>
                          )}
                        />
                        <Pagination.NextTrigger asChild>
                          <IconButton aria-label="Next page">
                            <CaretRightIcon />
                          </IconButton>
                        </Pagination.NextTrigger>
                      </ButtonGroup>
                    </Flex>
                  </Pagination.Root>
                )}
              </>
            )}
          </Box>

          <Box>
            <Heading as="h2" size="md" fontWeight="normal" mb={5}>
              Create new dashboard
            </Heading>
            <NewDashboardScreen />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
