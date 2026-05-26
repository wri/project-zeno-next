"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Container,
  Flex,
  Heading,
  Text,
  Box,
  Button,
  SimpleGrid,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import { SquaresFourIcon, MapPinIcon, PlusIcon } from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";
import NewDashboardDialog from "@/app/components/portfolio/NewDashboardDialog";
import { toaster } from "@/app/components/ui/toaster";
import type { PinnedAoi } from "@/app/types/portfolio";

export default function DashboardsIndexPage() {
  const router = useRouter();
  const dashboards = useDashboardStore((s) => s.dashboards);
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...dashboards].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [dashboards]
  );

  function handleCreate(aoi: PinnedAoi, name?: string) {
    const d = createDashboard({ aoi, name });
    toaster.create({
      title: "Dashboard created",
      description: d.name,
      type: "success",
      duration: 2200,
    });
    router.push(`/dashboards/${d.id}`);
  }

  return (
    <Container maxW="5xl" py={8}>
      <Flex
        align="center"
        justify="space-between"
        gap={2}
        mb={1}
        flexWrap="wrap"
      >
        <Flex align="center" gap={2}>
          <SquaresFourIcon size={20} />
          <Heading as="h1" size="lg" m={0}>
            Area Dashboards
          </Heading>
        </Flex>
        <Button
          colorPalette="primary"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon size={16} />
          New dashboard
        </Button>
      </Flex>
      <Text fontSize="sm" color="fg.muted" mb={6}>
        {dashboards.length} dashboard{dashboards.length === 1 ? "" : "s"} ·
        One AOI per dashboard
      </Text>

      {sorted.length === 0 && (
        <Box
          border="1px dashed"
          borderColor="border"
          rounded="md"
          p={10}
          textAlign="center"
          color="fg.muted"
        >
          <Text mb={3}>No dashboards yet.</Text>
          <Button
            colorPalette="primary"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <PlusIcon size={14} />
            Create your first dashboard
          </Button>
          <Text fontSize="xs" mt={3}>
            Or seed one from any pinned insight via the pin → dashboard option.
          </Text>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {sorted.map((d) => (
          <Link
            key={d.id}
            href={`/dashboards/${d.id}`}
            style={{ textDecoration: "none" }}
          >
            <Box
              bg="bg"
              border="1px solid"
              borderColor="border"
              borderLeft="3px solid"
              borderLeftColor="green.solid"
              rounded="md"
              p={4}
              _hover={{ borderColor: "primary.solid", bg: "bg.muted" }}
              transition="all 0.12s"
              cursor="pointer"
            >
              <HStack mb={1.5}>
                <MapPinIcon size={16} />
                <Heading size="sm" m={0} truncate>
                  {d.name}
                </Heading>
                {d.aoi.isMultiArea && (
                  <Badge colorPalette="orange" variant="subtle" size="xs">
                    Multi-area
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                {d.blocks.length} block{d.blocks.length === 1 ? "" : "s"} ·
                Created {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
              </Text>
            </Box>
          </Link>
        ))}
      </SimpleGrid>

      <NewDashboardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </Container>
  );
}
