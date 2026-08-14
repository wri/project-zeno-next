"use client";

import { useMemo, useState } from "react";
import {
  Box,
  ButtonGroup,
  Container,
  Flex,
  Grid,
  Heading,
  IconButton,
  Pagination,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

import { byRecentlyUpdated, paginate } from "../lib/pagination";
import DashboardCard from "./DashboardCard";
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

export default function DashboardsPage() {
  const { data: dashboards = [], isLoading, isError } = useDashboards();
  const [requestedPage, setRequestedPage] = useState(1);

  const ordered = useMemo(
    () => [...dashboards].sort(byRecentlyUpdated),
    [dashboards]
  );

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
            <Heading as="h1" size="lg" fontWeight="normal" mb={6}>
              My dashboards
            </Heading>
            {isLoading ? (
              <Flex align="center" gap={2} color="fg.muted">
                <Spinner size="sm" /> Loading dashboards...
              </Flex>
            ) : isError ? (
              <Text color="fg.error">Could not load dashboards.</Text>
            ) : ordered.length === 0 ? (
              <Box
                bg="white"
                borderWidth="1px"
                borderColor="border"
                borderRadius="sm"
                p={6}
              >
                <Text color="fg.muted">
                  You have no dashboards yet. Search for an area below to create
                  one.
                </Text>
              </Box>
            ) : (
              <>
                {/* Fixed-width cards per the Figma; as many as fit per row. */}
                <Grid
                  templateColumns={{
                    base: "1fr",
                    sm: `repeat(auto-fill, ${CARD_WIDTH}px)`,
                  }}
                  gap={`${GRID_GAP}px`}
                >
                  {items.map((dashboard) => (
                    <DashboardCard key={dashboard.id} dashboard={dashboard} />
                  ))}
                </Grid>

                {totalPages > 1 && (
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
