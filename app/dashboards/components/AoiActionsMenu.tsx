"use client";

import { useRouter } from "next/navigation";
import { IconButton, Menu, Portal } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  BookmarkSimpleIcon,
  SquaresFourIcon,
  ChartLineIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import { Tooltip } from "@/app/components/ui/tooltip";
import { createDashboardForAoi } from "@/app/dashboards/lib/createDashboardForAoi";

// Category header style (ANALYSIS / MONITORING) — small uppercase grey mono,
// matching the design's section labels.
const GROUP_LABEL = {
  fontFamily: "mono",
  fontSize: "10px",
  letterSpacing: "0.5px",
  textTransform: "uppercase" as const,
  fontWeight: "normal" as const,
  color: "#656E7B",
};

/**
 * "…" actions menu shown as a separate button beside an AOI label on the map.
 * "Generate analysis" injects a generative-analysis prompt into the chat for
 * this AOI (wired by the caller) — the same path as the chat AnalyseNudge.
 */
export default function AoiActionsMenu({
  name,
  isActive,
  onViewAnalysis,
  onGenerateAnalysis,
  onRemove,
}: {
  name: string;
  /** Selected (in-context) AOI — drives the solid vs subtle trigger styling. */
  isActive?: boolean;
  /** Runs the default (deterministic) analysis for this AOI. Disabled when
   *  omitted (e.g. a custom area with no backend-known source). */
  onViewAnalysis?: () => void;
  /** Injects a generative-analysis prompt into the chat for this AOI. */
  onGenerateAnalysis?: () => void;
  /** Removes this AOI from the map / context. Disabled when omitted. */
  onRemove?: () => void;
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
    // Anchor the dropdown to the trigger: its top-right corner sits at the
    // bottom-right edge of the "…" button.
    <Menu.Root positioning={{ placement: "bottom-end" }}>
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
            {/* ANALYSIS */}
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel {...GROUP_LABEL}>
                Analysis
              </Menu.ItemGroupLabel>
              <Menu.Item
                value="view-analysis"
                disabled={!onViewAnalysis}
                onClick={() => onViewAnalysis?.()}
              >
                <ChartLineIcon size={16} />
                View Analysis
              </Menu.Item>
              <Menu.Item
                value="run-ai-analysis"
                fontWeight="medium"
                disabled={!onGenerateAnalysis}
                onClick={() => onGenerateAnalysis?.()}
              >
                <SparkleIcon size={16} color="#0049AA" />
                Run AI Analysis
              </Menu.Item>
            </Menu.ItemGroup>

            <Menu.Separator />

            {/* MONITORING */}
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel {...GROUP_LABEL}>
                Monitoring
              </Menu.ItemGroupLabel>
              <Menu.Item value="bookmark" onClick={() => stub("Bookmark area")}>
                <BookmarkSimpleIcon size={16} />
                Bookmark
              </Menu.Item>
              <Menu.Item value="create-dashboard" onClick={createDashboard}>
                <SquaresFourIcon size={16} />
                Create a dashboard
              </Menu.Item>
            </Menu.ItemGroup>

            <Menu.Separator />

            <Menu.Item
              value="remove"
              disabled={!onRemove}
              onClick={() => onRemove?.()}
            >
              <XIcon size={16} />
              Remove from map
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
