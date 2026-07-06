"use client";

import { useRouter } from "next/navigation";
import { Breadcrumb, Container, Heading, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import AoiSearchTable from "@/app/components/dashboards/AoiSearchTable";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { useCreateDashboard } from "@/app/hooks/useDashboards";
import type { AoiSearchResult } from "@/app/schemas/api/aois/get";

export default function NewDashboardPage() {
  const isReady = useAuthGuard();
  const router = useRouter();
  const createDashboard = useCreateDashboard();

  const startDashboard = (result: AoiSearchResult) => {
    if (createDashboard.isPending) return;
    createDashboard.mutate(
      {
        aois: [
          {
            source: result.source,
            src_id: result.src_id,
            subtype: result.subtype,
            name: result.name,
          },
        ],
      },
      {
        onSuccess: (dashboard) => router.push(`/dashboards/${dashboard.id}`),
      }
    );
  };

  if (!isReady) return null;

  return (
    <Container maxW="4xl" py={10} h="100%" overflowY="auto">
      <Breadcrumb.Root mb={6} fontSize="sm">
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild>
              <NextLink href="/dashboards">Dashboards</NextLink>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>New dashboard</Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <Heading size="lg" mb={1}>
        Create new dashboard
      </Heading>
      <Text color="fg.muted" mb={6}>
        A dashboard monitors one area. Pick the area you want to track — you can
        add analyses, maps and notes to it afterwards.
      </Text>

      <AoiSearchTable
        onSelect={startDashboard}
        isCreating={createDashboard.isPending}
      />
    </Container>
  );
}
