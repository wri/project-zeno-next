"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Spinner,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { ArrowLeftIcon, PrinterIcon } from "@phosphor-icons/react";

import { searchWithMode } from "../hooks/useDashboardMode";
import { useDashboard } from "./dashboardQueries";
import { dashboardActionStyle } from "./DashboardHeader";
import { DashboardTitleHeading, DashboardUpdatedLabel } from "./DashboardTitle";
import DashboardWidgetsGrid from "./DashboardWidgetsGrid";

/**
 * The dashboard's export surface: a standalone, print-oriented page at
 * `/dashboards/[id]/report` that renders the same widget grid forced into
 * report mode — no chat overlay, no app chrome, a document header instead of
 * the editable one. "Save as PDF" is the browser's print dialog; the action
 * bar hides itself in the printout. This route is also the seam for a future
 * headless server-side PDF render.
 */
export default function DashboardReportPage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params?.id ?? "";
  const { data: dashboard, isLoading, isError } = useDashboard(dashboardId);

  // Back-link to the interactive dashboard, preserving ?ff= (the gate) but
  // not ?mode= — the detail page picks its own default. Read once on first
  // client render (the useDashboardMode seeding pattern); the search string
  // is stable for the page's lifetime.
  const [backSearch] = useState(() =>
    typeof window === "undefined"
      ? ""
      : searchWithMode(window.location.search, null)
  );

  return (
    <Box bg="white" minH="100vh">
      {/* Action bar — screen only, never printed. */}
      <Flex
        justify="space-between"
        align="center"
        px={{ base: 4, md: 8 }}
        py={3}
        borderBottomWidth="1px"
        borderColor="rgba(19,22,25,0.1)"
        position="sticky"
        top={0}
        bg="white"
        zIndex={10}
        css={{ "@media print": { display: "none" } }}
      >
        <ChakraLink asChild color="#565E7B" fontSize="14px">
          <Link href={`/dashboards/${dashboardId}${backSearch}`}>
            <ArrowLeftIcon size={16} />
            Back to dashboard
          </Link>
        </ChakraLink>
        <Button
          size="xs"
          variant="outline"
          {...dashboardActionStyle}
          onClick={() => window.print()}
        >
          <PrinterIcon size={16} />
          Save as PDF
        </Button>
      </Flex>

      <Container maxW="1232px" py={{ base: 6, md: 10 }}>
        {isLoading ? (
          <Flex align="center" gap={2} color="fg.muted" py={12}>
            <Spinner size="sm" /> Loading dashboard...
          </Flex>
        ) : isError || !dashboard ? (
          <Text color="fg.error" py={12}>
            Could not load this dashboard.
          </Text>
        ) : (
          <>
            <Box mb={{ base: 8, md: "56px" }}>
              <DashboardTitleHeading name={dashboard.name} />
              <DashboardUpdatedLabel updatedAt={dashboard.updated_at} />
              {dashboard.aois[0]?.name && (
                <Text mt="4px" fontSize="12px" color="#565E7B">
                  Area of interest: {dashboard.aois[0].name}
                </Text>
              )}
            </Box>

            {dashboard.widgets.length > 0 ? (
              <DashboardWidgetsGrid dashboard={dashboard} mode="report" />
            ) : (
              <Text color="fg.muted" py={12}>
                This dashboard has no widgets to export.
              </Text>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
