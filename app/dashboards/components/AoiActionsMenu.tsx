"use client";

import { useRouter } from "next/navigation";
import { Box, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import {
  DotsThreeVerticalIcon,
  BookmarkSimpleIcon,
  SquaresFourIcon,
  ChartLineIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { toaster } from "@/app/components/ui/toaster";
import { createDashboardForAoi } from "@/app/dashboards/lib/createDashboardForAoi";

/** "…" actions menu shown beside an AOI label on the map. */
export default function AoiActionsMenu({ name }: { name: string }) {
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
      <Menu.Trigger asChild>
        <IconButton
          aria-label={`Actions for ${name}`}
          size="2xs"
          variant="ghost"
          minW="18px"
          h="18px"
          px={0}
          color="inherit"
          _hover={{ bg: "blackAlpha.200" }}
        >
          <DotsThreeVerticalIcon size={14} />
        </IconButton>
      </Menu.Trigger>
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
            <Menu.Item value="dataset" onClick={() => stub("Active dataset")}>
              <ChartLineIcon size={16} />
              Tree cover loss
              <Box ml="auto" bg="#F4F5F6" rounded="sm" px="5px" py="2px">
                <Text fontFamily="mono" fontSize="9px" color="#3A4048">
                  Active dataset
                </Text>
              </Box>
            </Menu.Item>
            <Menu.Item value="zeno" onClick={() => stub("Zeno suggestion")}>
              <StarIcon size={16} color="#0049AA" />
              Suggested analysis
              <Box ml="auto" bg="#F7FBD9" rounded="sm" px="5px" py="2px">
                <Text fontFamily="mono" fontSize="9px" color="#23271A">
                  Zeno
                </Text>
              </Box>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
