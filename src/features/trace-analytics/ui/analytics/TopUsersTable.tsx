"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tabHref } from "../links";
import { Badge, Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import type { UserActivity } from "../../lib/analytics/topUsers";
import { ChartCard } from "../charts/ChartCard";
import { formatCount, formatPercent } from "../../lib/format";

const PAGE_SIZE = 15;

interface TopUsersTableProps {
  readonly activity: readonly UserActivity[];
  /** id → email lookup from the users API (null until users are loaded). */
  readonly emailByUserId: ReadonlyMap<string, string> | null;
  /** id → first-seen date (all-time) from the users API. */
  readonly firstSeenByUser: ReadonlyMap<string, string> | null;
}

/** Most active users in the window, with drill-through to their conversations. */
export function TopUsersTable({
  activity,
  emailByUserId,
  firstSeenByUser,
}: TopUsersTableProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const visible = useMemo(() => activity.slice(0, limit), [activity, limit]);

  return (
    <ChartCard
      title="Top users"
      help="Most active users in the window, ranked by prompts sent."
      info="“Since” is the account's first-seen date (all-time when user data is
        loaded), so you can tell long-time heavy users from new arrivals. Success
        is the share of their prompts that produced an answer — a low rate for a
        heavy user is a support conversation waiting to happen. Click a user to
        open their conversations."
    >
      {activity.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          No user activity in the window.
        </Text>
      ) : (
        <Flex direction="column" gap={3}>
          <Box overflowX="auto">
            <Table.Root size="sm" striped>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    User
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    textAlign="right"
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    Prompts
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    textAlign="right"
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    Sessions
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    textAlign="right"
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    Active days
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    textAlign="right"
                    color="fg.subtle"
                    fontWeight="normal"
                  >
                    Success
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    Since
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="fg.subtle" fontWeight="normal">
                    Status
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visible.map((user) => {
                  const email = emailByUserId?.get(user.userId);
                  const since =
                    firstSeenByUser?.get(user.userId) ?? user.firstActive;
                  return (
                    <Table.Row key={user.userId}>
                      <Table.Cell maxW="260px">
                        <Link
                          href={tabHref("conversations", {
                            user: user.userId,
                          })}
                          title={`Open conversations for ${email ?? user.userId}`}
                        >
                          <Text
                            fontSize="sm"
                            color="fg.link"
                            lineClamp={1}
                            fontFamily={email ? undefined : "mono"}
                          >
                            {email ?? user.userId}
                          </Text>
                        </Link>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {formatCount(user.prompts)}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {formatCount(user.sessions)}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {formatCount(user.activeDays)}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {formatPercent(user.successRate, 0)}
                      </Table.Cell>
                      <Table.Cell
                        fontFamily="mono"
                        fontSize="xs"
                        whiteSpace="nowrap"
                      >
                        {since ?? ""}
                      </Table.Cell>
                      <Table.Cell>
                        {user.engaged ? (
                          <Badge
                            colorPalette="green"
                            variant="subtle"
                            fontSize="2xs"
                          >
                            Engaged
                          </Badge>
                        ) : null}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
          {activity.length > limit ? (
            <Button
              size="xs"
              variant="outline"
              alignSelf="center"
              onClick={() => setLimit(limit + PAGE_SIZE)}
            >
              Show more ({formatCount(activity.length - limit)} remaining)
            </Button>
          ) : null}
        </Flex>
      )}
    </ChartCard>
  );
}
