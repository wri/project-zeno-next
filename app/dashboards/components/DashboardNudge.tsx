"use client";

import { Button } from "@chakra-ui/react";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { createDashboardForAoi } from "@/app/dashboards/lib/createDashboardForAoi";

/** Chat nudge: create + open a dashboard for the selected area. */
export default function DashboardNudge({ areaName }: { areaName: string }) {
  const router = useRouter();
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
      onClick={() =>
        router.push(`/dashboards/${createDashboardForAoi(areaName)}`)
      }
    >
      <SquaresFourIcon
        weight="thin"
        color="var(--chakra-colors-primary-solid)"
      />
      Create a dashboard for {areaName}
    </Button>
  );
}
