import type { ReactNode } from "react";
import { Badge, Box, Flex, Table, Text, chakra } from "@chakra-ui/react";
import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import type { ProfileLabels } from "../api/profile-labels";
import { codeLabel } from "../lib/filter-users";
import { formatDay } from "../lib/format";
import { SIGNUP_SOURCE_COPY, type ManagedUser } from "../lib/managed-user";
import type { SortKey, UserSort } from "../lib/sort-users";

const NONE = (
  <Text as="span" color="fg.subtle">
    —
  </Text>
);

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: UserSort;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  const ascending = sort.direction === "asc";
  return (
    <Table.ColumnHeader
      aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}
    >
      <chakra.button
        type="button"
        display="inline-flex"
        alignItems="center"
        gap={1}
        cursor="pointer"
        color="inherit"
        fontWeight="inherit"
        _hover={{ color: "fg" }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "primary.focusRing",
          outlineOffset: "1px",
          borderRadius: "xs",
        }}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? (
          ascending ? (
            <CaretUpIcon size={12} />
          ) : (
            <CaretDownIcon size={12} />
          )
        ) : (
          <Box as="span" color="fg.subtle" aria-hidden="true">
            <CaretUpDownIcon size={12} />
          </Box>
        )}
      </chakra.button>
    </Table.ColumnHeader>
  );
}

/** A profile code's label, cut short in the cell with the full text on hover. */
function CodeCell({
  labels,
  code,
}: {
  labels: Record<string, string> | undefined;
  code: string | null;
}) {
  if (code === null) return NONE;
  const label = codeLabel(labels, code);
  return (
    <Text truncate maxW="32" title={label}>
      {label}
    </Text>
  );
}

export function UsersTable({
  users,
  sort,
  onSort,
  labels,
  selfId,
  typeCell,
}: {
  users: ManagedUser[];
  sort: UserSort;
  onSort: (key: SortKey) => void;
  labels: ProfileLabels | undefined;
  selfId: string | null;
  typeCell: (user: ManagedUser) => ReactNode;
}) {
  return (
    <Table.ScrollArea borderWidth="1px" borderColor="border" rounded="md">
      <Table.Root
        size="sm"
        interactive
        minW="3xl"
        css={{ "& th, & td": { whiteSpace: "nowrap" } }}
      >
        <Table.Header bg="bg.subtle">
          <Table.Row>
            <SortHeader
              label="User"
              sortKey="email"
              sort={sort}
              onSort={onSort}
            />
            <Table.ColumnHeader>Country</Table.ColumnHeader>
            <Table.ColumnHeader>Sector</Table.ColumnHeader>
            <Table.ColumnHeader>Language</Table.ColumnHeader>
            <SortHeader
              label="Joined"
              sortKey="joined"
              sort={sort}
              onSort={onSort}
            />
            <Table.ColumnHeader>Profile</Table.ColumnHeader>
            <Table.ColumnHeader>Source</Table.ColumnHeader>
            <SortHeader
              label="Type"
              sortKey="type"
              sort={sort}
              onSort={onSort}
            />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {users.map((user) => {
            const details = [user.name, user.organization]
              .filter(Boolean)
              .join(" · ");
            return (
              <Table.Row key={user.id}>
                {/* Takes the width the other columns leave, and truncates. */}
                <Table.Cell w="full" maxW="0">
                  <Flex alignItems="center" gap={1.5}>
                    <Text fontWeight="medium" truncate title={user.email}>
                      {user.email}
                    </Text>
                    {user.audience === "internal" && (
                      <Badge size="sm" colorPalette="primary" flexShrink={0}>
                        Internal
                      </Badge>
                    )}
                    {user.id === selfId && (
                      <Badge size="sm" flexShrink={0}>
                        You
                      </Badge>
                    )}
                  </Flex>
                  {details && (
                    <Text fontSize="xs" color="fg.muted" truncate>
                      {details}
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <CodeCell
                    labels={labels?.countries}
                    code={user.countryCode}
                  />
                </Table.Cell>
                <Table.Cell>
                  <CodeCell labels={labels?.sectors} code={user.sectorCode} />
                </Table.Cell>
                <Table.Cell>
                  <CodeCell
                    labels={labels?.languages}
                    code={user.languageCode}
                  />
                </Table.Cell>
                <Table.Cell fontVariantNumeric="tabular-nums">
                  {user.joinedOn ? formatDay(user.joinedOn) : NONE}
                </Table.Cell>
                <Table.Cell>
                  {user.hasProfile ? (
                    <Flex alignItems="center" gap={1} color="fg.success">
                      <CheckIcon size={14} aria-hidden="true" />
                      Completed
                    </Flex>
                  ) : (
                    NONE
                  )}
                </Table.Cell>
                <Table.Cell>
                  {SIGNUP_SOURCE_COPY[user.signupSource].column ?? NONE}
                </Table.Cell>
                <Table.Cell>{typeCell(user)}</Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
