"use client";

import { useRouter } from "next/navigation";
import { Box, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  BookmarkSimpleIcon,
  SquaresFourIcon,
  ChartLineIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import { Tooltip } from "@/app/components/ui/tooltip";
import { createDashboardForAoi } from "@/app/dashboards/lib/createDashboardForAoi";

/**
 * "…" actions menu shown as a separate button beside an AOI label on the map.
 * "View analysis" runs the default analysis for this AOI (wired by the caller).
 */
export default function AoiActionsMenu({
  name,
  isActive,
  analyzing,
  onViewAnalysis,
}: {
  name: string;
  /** Selected (in-context) AOI — drives the solid vs subtle trigger styling. */
  isActive?: boolean;
  /** True while an analysis is in flight for this AOI. */
  analyzing?: boolean;
  /** Runs the default analysis for this AOI. */
  onViewAnalysis?: () => void;
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
    <Menu.Root positioning={{ placement: "top-end" }}>
      <Tooltip content="Map actions" variant="dark" showArrow openDelay={200}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="Map actions"
            variant="solid"
            h="34px"
            minW="34px"
            w="34px"
            rounded="md"
            boxShadow="sm"
            bg={isActive ? "#21509A" : "rgba(255,255,255,0.92)"}
            color={isActive ? "#FFFFFF" : "#3A4048"}
            borderWidth={isActive ? "0" : "1px"}
            borderColor="rgba(19,22,25,0.12)"
            _hover={{ bg: isActive ? "#1B4382" : "#FFFFFF" }}
          >
            <DotsThreeVerticalIcon size={16} />
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
              value="view-analysis"
              disabled={analyzing || !onViewAnalysis}
              onClick={() => onViewAnalysis?.()}
            >
              <ChartLineIcon size={16} color="#0049AA" />
              {analyzing ? "Analyzing…" : "View analysis"}
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
