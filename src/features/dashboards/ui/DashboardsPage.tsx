"use client";

import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { toaster } from "@/app/components/ui/toaster";
import type { AoiSearchResult } from "../api/schemas";
import {
  useCreateDashboardFromAoi,
  useDashboards,
} from "../model/dashboardQueries";
import AoiSearchTable from "./AoiSearchTable";
import DashboardCard from "./DashboardCard";

export default function DashboardsPage() {
  const router = useRouter();
  const { data: dashboards = [], isLoading, isError } = useDashboards();
  const createDashboard = useCreateDashboardFromAoi();

  const handleCreateDashboard = (aoi: AoiSearchResult) => {
    createDashboard.mutate(aoi, {
      onSuccess: (dashboard) => {
        router.push(`/dashboards/${dashboard.id}`);
      },
      onError: (error) => {
        toaster.create({
          title: "Could not create dashboard",
          description: (error as Error)?.message || "Please try another area.",
          type: "error",
          duration: 5000,
        });
      },
    });
  };

  return (
    <Box bg="#F4F5F6" minH="calc(100vh - 40px)" py={{ base: 8, md: 14 }}>
      <Container maxW="6xl">
        <Flex direction="column" gap={12}>
          <Box>
            <Heading as="h1" size="lg" fontWeight="normal" mb={6}>
              My dashboards
            </Heading>
            {isLoading ? (
              <Flex align="center" gap={2} color="fg.muted">
                <Spinner size="sm" /> Loading dashboards...
              </Flex>
            ) : isError ? (
              <Text color="fg.error">Could not load dashboards.</Text>
            ) : dashboards.length === 0 ? (
              <Box
                bg="white"
                borderWidth="1px"
                borderColor="border"
                borderRadius="sm"
                p={6}
              >
                <Text color="fg.muted">
                  You have no dashboards yet. Search for an area below to create
                  one.
                </Text>
              </Box>
            ) : (
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                }}
                gap={4}
              >
                {dashboards.map((dashboard) => (
                  <DashboardCard key={dashboard.id} dashboard={dashboard} />
                ))}
              </Grid>
            )}
          </Box>

          <Box>
            <Heading as="h2" size="md" fontWeight="normal" mb={5}>
              Create new dashboard
            </Heading>
            <AoiSearchTable
              isCreating={createDashboard.isPending}
              onCreateDashboard={handleCreateDashboard}
            />
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
