"use client";

import { useRouter } from "next/navigation";
import { Box, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  BookmarkSimpleIcon,
  SquaresFourIcon,
  ChartLineIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import { Tooltip } from "@/app/components/ui/tooltip";
import { createDashboardForAoi } from "@/app/dashboards/lib/createDashboardForAoi";

/**
 * "…" actions menu shown as a separate button beside an AOI label on the map.
 * "Generate analysis" injects a generative-analysis prompt into the chat for
 * this AOI (wired by the caller) — the same path as the chat AnalyseNudge.
 */
export default function AoiActionsMenu({
  name,
  isActive,
  onGenerateAnalysis,
  getAnchorRect,
}: {
  name: string;
  /** Selected (in-context) AOI — drives the solid vs subtle trigger styling. */
  isActive?: boolean;
  /** Injects a generative-analysis prompt into the chat for this AOI. */
  onGenerateAnalysis?: () => void;
  /** Anchors the dropdown to a point (e.g. the bbox corner) instead of the
   *  trigger. Returns a viewport-space rect, or null to fall back to default. */
  getAnchorRect?: () => {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}) {
  const router = useRouter();

  const stub = (label: string) =>
    toaster.create({
      title: `${label} — prototype`,
      type: "info",
      duration: 2000,
    });

  const createDashboard = () => {
    const id = createDashboardForAoi(name);
    router.push(`/dashboards/${id}`);
  };

  return (
    <Menu.Root
      positioning={{
        placement: "bottom-start",
        ...(getAnchorRect ? { getAnchorRect } : {}),
      }}
    >
      <Tooltip content="Map actions" variant="dark" showArrow openDelay={200}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="Map actions"
            variant="solid"
            h="24px"
            minW="24px"
            w="24px"
            rounded="md"
            boxShadow="sm"
            bg={isActive ? "#21509A" : "rgba(255,255,255,0.92)"}
            color={isActive ? "#FFFFFF" : "#3A4048"}
            borderWidth={isActive ? "0" : "1px"}
            borderColor="rgba(19,22,25,0.12)"
            _hover={{ bg: isActive ? "#1B4382" : "#FFFFFF" }}
          >
            <DotsThreeVerticalIcon size={14} />
          </IconButton>
        </Menu.Trigger>
      </Tooltip>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="220px">
            <Menu.Item value="bookmark" onClick={() => stub("Bookmark area")}>
              <BookmarkSimpleIcon size={16} />
              Bookmark area
            </Menu.Item>
            <Menu.Item value="create-dashboard" onClick={createDashboard}>
              <SquaresFourIcon size={16} />
              Create dashboard
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              value="generate-analysis"
              disabled={!onGenerateAnalysis}
              onClick={() => onGenerateAnalysis?.()}
            >
              <SparkleIcon size={16} color="#0049AA" />
              Generate analysis
              <Box ml="auto" bg="#F7FBD9" rounded="sm" px="5px" py="2px">
                <Text fontFamily="mono" fontSize="9px" color="#23271A">
                  Zeno
                </Text>
              </Box>
            </Menu.Item>
            <Menu.Item value="dataset" onClick={() => stub("Active dataset")}>
              <ChartLineIcon size={16} />
              Tree cover loss
              <Box ml="auto" bg="#F4F5F6" rounded="sm" px="5px" py="2px">
                <Text fontFamily="mono" fontSize="9px" color="#3A4048">
                  Active dataset
                </Text>
              </Box>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
