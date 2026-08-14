"use client";
import { Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { SquaresFourIcon } from "@phosphor-icons/react";

import type { CreateDashboardSuggestion } from "@/app/types/chat";

import { useCreateDashboardForArea } from "./useCreateDashboardForArea";

/**
 * In-chat "Create Dashboard" nudge — presentational sibling of AnalyseNudge /
 * ViewAnalysisNudge.
 *
 * The label is derived, not stored: it asks the dashboards list whether this
 * area already has a dashboard on every render. So after a create, the same
 * card relabels itself from "Create …" to "Open …" as soon as the list
 * invalidation lands — no accepted state to track, and the card stays correct
 * if the user makes (or deletes) the dashboard by some other route.
 */
export default function CreateDashboardNudge({
  suggestion,
}: {
  suggestion: CreateDashboardSuggestion;
}) {
  const router = useRouter();
  const { existing, isResolving, isCreating, create } =
    useCreateDashboardForArea(suggestion);

  const label = existing
    ? `Open ${suggestion.areaName} Dashboard`
    : `Create Dashboard for ${suggestion.areaName}`;

  const handleClick = () => {
    if (existing) {
      router.push(`/dashboards/${existing.id}`);
      return;
    }
    void create();
  };

  return (
    <Button
      w="full"
      variant="outline"
      justifyContent="flex-start"
      gap={2}
      px={3}
      py={2}
      h="auto"
      minH={10}
      fontSize="xs"
      fontWeight="light"
      textAlign="left"
      whiteSpace="normal"
      rounded="lg"
      borderColor="border.emphasized"
      _hover={{ bg: "primary.50", borderColor: "primary.emphasized" }}
      onClick={handleClick}
      // Disabled until the dashboards list resolves: until then we can't tell
      // "create" from "open", and a click would make a second dashboard for an
      // area that already has one.
      disabled={isResolving || isCreating}
    >
      <SquaresFourIcon
        weight="regular"
        color="var(--chakra-colors-primary-solid)"
      />
      {isCreating ? `Creating ${suggestion.areaName} Dashboard…` : label}
    </Button>
  );
}
