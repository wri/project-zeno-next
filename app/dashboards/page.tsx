"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Container,
  Flex,
  Heading,
  IconButton,
  LinkBox,
  LinkOverlay,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { SquaresFourIcon, TrashIcon } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { Tooltip } from "@/app/components/ui/tooltip";
import ConfirmDialog from "@/app/components/dashboards/ConfirmDialog";
import {
  useDashboardsList,
  useDeleteDashboard,
} from "@/app/hooks/useDashboards";
import type { Dashboard } from "@/app/schemas/api/dashboards/get";

function DashboardRow({ dashboard }: { dashboard: Dashboard }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteDashboard = useDeleteDashboard();

  return (
    <LinkBox
      as="article"
      p={4}
      rounded="md"
      border="1px solid"
      borderColor="border.emphasized"
      _hover={{ bg: "bg.subtle" }}
    >
      <Flex justify="space-between" align="center" gap={4}>
        <Flex direction="column" gap={1} minW={0}>
          <LinkOverlay asChild>
            <Link href={`/dashboards/${dashboard.id}`}>
              <Heading size="sm" m={0}>
                {dashboard.name}
              </Heading>
            </Link>
          </LinkOverlay>
          {dashboard.description && (
            <Text fontSize="sm" color="fg.muted" lineClamp={1}>
              {dashboard.description}
            </Text>
          )}
          <Text fontSize="xs" color="fg.muted">
            {dashboard.widgets.length}{" "}
            {dashboard.widgets.length === 1 ? "widget" : "widgets"} · updated{" "}
            {formatDistanceToNow(new Date(dashboard.updated_at), {
              addSuffix: true,
            })}
          </Text>
        </Flex>
        <Tooltip content="Delete dashboard" showArrow>
          <IconButton
            size="xs"
            variant="ghost"
            colorPalette="red"
            position="relative"
            zIndex={1}
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete dashboard ${dashboard.name}`}
          >
            <TrashIcon size={16} />
          </IconButton>
        </Tooltip>
      </Flex>
      <ConfirmDialog
        title="Delete dashboard?"
        body={
          <p>
            This will permanently delete the dashboard{" "}
            <strong>{dashboard.name}</strong>. The insights it references are
            not deleted.
          </p>
        }
        confirmLabel="Delete"
        onConfirm={() => deleteDashboard.mutate(dashboard.id)}
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </LinkBox>
  );
}

export default function DashboardsPage() {
  const { dashboards, isLoading } = useDashboardsList();

  return (
    <Container maxW="4xl" py={10} h="100%" overflowY="auto">
      <Flex align="center" gap={2} mb={6} color="fg.muted">
        <SquaresFourIcon size={24} />
        <Heading as="h1" size="2xl" fontWeight="normal" m={0}>
          Dashboards
        </Heading>
      </Flex>
      {isLoading ? (
        <Flex justify="center" py={16}>
          <Spinner />
        </Flex>
      ) : !dashboards?.length ? (
        <Text color="fg.muted">
          No dashboards yet — ask the assistant to create one from the map view,
          e.g. “Create a dashboard for Paraná”.
        </Text>
      ) : (
        <Flex direction="column" gap={3}>
          {dashboards.map((dashboard) => (
            <DashboardRow key={dashboard.id} dashboard={dashboard} />
          ))}
        </Flex>
      )}
    </Container>
  );
}
