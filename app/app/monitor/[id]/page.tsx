"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Box, Text, Button, Flex } from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  ChatCircleIcon,
  ListIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import useDashboardStore from "@/app/store/dashboardStore";
import DashboardCanvas from "@/app/monitor/components/DashboardCanvas";

export default function DashboardPage() {
  const { id } = useParams();
  const router = useRouter();
  const { setActiveDashboard, getActiveDashboard } = useDashboardStore();

  useEffect(() => {
    setActiveDashboard(id as string);
    return () => setActiveDashboard(null);
  }, [id, setActiveDashboard]);

  const dashboard = getActiveDashboard();

  if (!dashboard) {
    return (
      <Box maxW="4xl" mx="auto">
        <Text color="fg.muted">Dashboard not found.</Text>
        <Button
          variant="ghost"
          size="sm"
          mt={2}
          onClick={() => router.push("/app/monitor")}
        >
          <ArrowLeftIcon /> Back to dashboards
        </Button>
      </Box>
    );
  }

  return (
    <Box maxW="4xl" mx="auto">
      <Flex align="center" gap={2} mb={4}>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app/monitor">
            <ListIcon /> All Dashboards
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ChatCircleIcon /> Back to Chat
          </Link>
        </Button>
      </Flex>
      <DashboardCanvas dashboard={dashboard} />
    </Box>
  );
}
