"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Link as ChakraLink,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { ArrowLeftIcon, PrinterIcon } from "@phosphor-icons/react";

import { Link, useParams } from "@/app/lib/router";
import { updatedOnLabel } from "../lib/dates";
import { hasDashboardContent } from "../lib/widgets";
import { useDashboard } from "./dashboardQueries";
import {
  DASHBOARD_ACTION_PROPS,
  DASHBOARD_TITLE_PROPS,
} from "./DashboardHeader";
import { PRINT_READY_ATTR } from "./DashboardMapWidget";
import DashboardWidgetsGrid from "./DashboardWidgetsGrid";

/** The printout's page margin; the paper column is sized against it. */
const PAGE_MARGIN = "12mm";

/**
 * The document column: the printable width of Letter landscape at
 * `PAGE_MARGIN` (255mm, about 965px; A4 is wider). Landscape, because the
 * dashboard's grid needs the room: single cards side by side, double ones
 * across the row, as on screen. The page lays out at this width on screen
 * too, so printing never reflows it. Charts and maps size themselves in JS,
 * which doesn't run for the print layout, so a wider screen layout would
 * print at its screen width and run off the page. For the same reason it
 * never narrows to a small viewport; the page scrolls instead.
 */
const PAPER_WIDTH = "960px";

/** How long Save as PDF waits for the maps before printing regardless. */
const MAP_WAIT_MS = 20_000;

const mapsStillDrawing = () =>
  document.querySelector(`[${PRINT_READY_ATTR}="false"]`) !== null;

/** A CSS string literal, for the dashboard name in the page footer. */
const cssString = (value: string) => `"${value.replace(/[\\"]/g, "\\$&")}"`;

/**
 * The printed page. Defining the margin boxes replaces the browser's own
 * header and footer (date, title, URL) with the dashboard's name and page
 * numbers; the empty top boxes are what switch the browser's header off.
 */
const pageCss = (name: string | undefined) => `@page {
  size: landscape;
  margin: ${PAGE_MARGIN};
  @top-left { content: ""; }
  @top-center { content: ""; }
  @top-right { content: ""; }
  @bottom-left {
    content: ${cssString(name ?? "")};
    font-size: 9px;
    color: rgba(19, 22, 25, 0.6);
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 9px;
    color: rgba(19, 22, 25, 0.6);
  }
}`;

/**
 * The dashboard's export: a standalone page at `/dashboards/[id]/report` that
 * renders the widgets as a read-only document, on screen as it will print.
 * "Save as PDF" is the browser's print dialog, and the action bar leaves
 * itself off the printout.
 *
 * It never prints on its own, and Save as PDF waits for the maps: their
 * areas and tiles load asynchronously, and printing sooner saves the world
 * view or blank tiles.
 */
export default function DashboardReportPage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params?.id ?? "";
  const { data: dashboard, isLoading, isError } = useDashboard(dashboardId);
  const name = dashboard?.name;
  const [waitingForMaps, setWaitingForMaps] = useState(false);

  const saveAsPdf = () => {
    if (mapsStillDrawing()) setWaitingForMaps(true);
    else window.print();
  };

  useEffect(() => {
    if (!waitingForMaps) return;
    let printed = false;
    const printOnce = () => {
      if (printed) return;
      printed = true;
      setWaitingForMaps(false);
      window.print();
    };
    const observer = new MutationObserver(() => {
      if (!mapsStillDrawing()) printOnce();
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: [PRINT_READY_ATTR],
    });
    // A tile server that never answers must not hold the PDF hostage.
    const timer = setTimeout(printOnce, MAP_WAIT_MS);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [waitingForMaps]);

  useEffect(() => {
    // The print dialog offers the document title as the PDF's file name.
    if (!name) return;
    const previous = document.title;
    document.title = name;
    return () => {
      document.title = previous;
    };
  }, [name]);

  return (
    <Box
      bg="#F4F5F6"
      minH="100vh"
      _print={{ bg: "white", minH: 0 }}
      // Print the page as it looks on screen: the template banner's fill,
      // chips and pills are backgrounds, which browsers drop by default.
      css={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <style>{pageCss(name)}</style>

      <Flex
        justify="space-between"
        align="center"
        px={{ base: 4, md: 8 }}
        py={3}
        bg="white"
        borderBottomWidth="1px"
        borderColor="rgba(19,22,25,0.1)"
        position="sticky"
        top={0}
        zIndex={10}
        _print={{ display: "none" }}
      >
        <ChakraLink asChild color="#565E7B" fontSize="14px">
          <Link href={`/dashboards/${dashboardId}`}>
            <ArrowLeftIcon size={16} />
            Back to dashboard
          </Link>
        </ChakraLink>
        <Button
          {...DASHBOARD_ACTION_PROPS}
          disabled={!dashboard}
          loading={waitingForMaps}
          loadingText="Loading maps…"
          onClick={saveAsPdf}
        >
          <PrinterIcon size={16} />
          Save as PDF
        </Button>
      </Flex>

      {/* The sheet: paper-white with the page margin on screen; on paper the
          browser supplies both. */}
      <Box
        w="fit-content"
        mx="auto"
        my={{ base: 0, md: 8 }}
        p={PAGE_MARGIN}
        bg="white"
        boxShadow="0 1px 3px rgba(19,22,25,0.12)"
        // Still centred on the paper, which is wider than the column on A4.
        _print={{ my: 0, p: 0, boxShadow: "none" }}
      >
        <Box w={PAPER_WIDTH}>
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
              <Box mb="32px">
                <Heading
                  as="h1"
                  {...DASHBOARD_TITLE_PROPS}
                  wordBreak="break-word"
                >
                  {dashboard.name}
                </Heading>
                <Text
                  mt="8px"
                  fontFamily="mono"
                  fontSize="10px"
                  lineHeight="16px"
                  color="rgba(19,22,25,0.7)"
                >
                  {updatedOnLabel(dashboard.updated_at)}
                </Text>
                {dashboard.aois[0]?.name && (
                  <Text mt="4px" fontSize="12px" color="#565E7B">
                    Area of interest: {dashboard.aois[0].name}
                  </Text>
                )}
              </Box>

              {hasDashboardContent(dashboard, {
                isOwner: false,
                pendingCount: 0,
              }) ? (
                <DashboardWidgetsGrid dashboard={dashboard} print />
              ) : (
                <Text color="fg.muted" py={12}>
                  This dashboard has no widgets to export.
                </Text>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
