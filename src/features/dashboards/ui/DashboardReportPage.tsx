"use client";

import { useEffect } from "react";
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
import { useDashboard } from "./dashboardQueries";
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
 * print at its screen width and run off the page.
 */
const PAPER_WIDTH = "960px";

const SCREEN_ONLY = { "@media print": { display: "none" } };

/**
 * The dashboard's export: a standalone page at `/dashboards/[id]/report` that
 * renders the widgets as a read-only document, on screen as it will print.
 * "Save as PDF" is the browser's print dialog, and the action bar leaves
 * itself off the printout.
 *
 * It never prints on its own: map tiles load asynchronously, and racing them
 * would save a half-drawn map. The user saves once the page looks right.
 */
export default function DashboardReportPage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params?.id ?? "";
  const { data: dashboard, isLoading, isError } = useDashboard(dashboardId);
  const name = dashboard?.name;

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
      css={{
        // Print the page as it looks on screen: the template banner's fill,
        // chips and pills are backgrounds, which browsers drop by default.
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        "@media print": { background: "white", minHeight: 0 },
      }}
    >
      <style>{`@page { size: landscape; margin: ${PAGE_MARGIN}; }`}</style>

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
        css={SCREEN_ONLY}
      >
        <ChakraLink asChild color="#565E7B" fontSize="14px">
          <Link href={`/dashboards/${dashboardId}`}>
            <ArrowLeftIcon size={16} />
            Back to dashboard
          </Link>
        </ChakraLink>
        <Button
          variant="outline"
          h="24px"
          px="8px"
          gap="4px"
          borderColor="rgba(19,22,25,0.2)"
          rounded="sm"
          fontSize="12px"
          fontWeight="medium"
          color="rgba(19,22,25,0.7)"
          disabled={!dashboard}
          onClick={() => window.print()}
        >
          <PrinterIcon size={16} />
          Save as PDF
        </Button>
      </Flex>

      {/* The sheet: paper-white with the page margin on screen; on paper the
          browser supplies both. */}
      <Box
        w="fit-content"
        maxW="100%"
        mx="auto"
        my={{ base: 0, md: 8 }}
        p={PAGE_MARGIN}
        bg="white"
        boxShadow="0 1px 3px rgba(19,22,25,0.12)"
        css={{ "@media print": { margin: 0, padding: 0, boxShadow: "none" } }}
      >
        <Box w={PAPER_WIDTH} maxW="100%">
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
                  fontSize="30px"
                  lineHeight="36px"
                  fontWeight="normal"
                  color="#131619"
                  mb="0"
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

              {dashboard.widgets.length > 0 ? (
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
