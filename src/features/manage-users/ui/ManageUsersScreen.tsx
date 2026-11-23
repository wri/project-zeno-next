import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import useAuthStore from "@/app/store/authStore";
import { useAdminUsersExport } from "@/app/hooks/useAdminUsersExport";
import { toaster } from "@/app/components/ui/toaster";
import type { AssignableUserType } from "@/app/schemas/api/admin/users/patch";
import { useAdminUsersList } from "../api/admin-users-list";
import { useAdminUserTypeUpdate } from "../api/admin-user-type-update";
import { useProfileLabels } from "../api/profile-labels";
import {
  NO_FILTERS,
  codeOptions,
  filterUsers,
  hasFilters,
  type UserFilters,
} from "../lib/filter-users";
import { formatCount, formatLoadedAt, usersLabel } from "../lib/format";
import type { ManagedUser } from "../lib/managed-user";
import { DEFAULT_PAGE_SIZE, pageOf, type PageSize } from "../lib/paging";
import {
  DEFAULT_SORT,
  nextSort,
  sortUsers,
  type SortKey,
} from "../lib/sort-users";
import { UserFiltersBar } from "./UserFiltersBar";
import { UserTypeCell } from "./UserTypeCell";
import { UsersPager } from "./UsersPager";
import { UsersTable } from "./UsersTable";

export function ManageUsersScreen() {
  const { userId } = useAuthStore();
  const [loadedSoFar, setLoadedSoFar] = useState(0);
  const list = useAdminUsersList(setLoadedSoFar);
  const { data: labels } = useProfileLabels();

  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const users = list.data;
  const matches = useMemo(
    () => (users ? sortUsers(filterUsers(users, filters), sort) : []),
    [users, filters, sort]
  );
  const countryOptions = useMemo(
    () =>
      codeOptions(users?.map((u) => u.countryCode) ?? [], labels?.countries),
    [users, labels]
  );
  const sectorOptions = useMemo(
    () => codeOptions(users?.map((u) => u.sectorCode) ?? [], labels?.sectors),
    [users, labels]
  );
  const shown = pageOf(matches, page, pageSize);
  const filtered = hasFilters(filters);

  const updateFilters = (patch: Partial<UserFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const clearFilters = () => updateFilters(NO_FILTERS);
  const sortBy = (key: SortKey) => {
    setSort((s) => nextSort(s, key));
    setPage(1);
  };
  const changePageSize = (size: PageSize) => {
    setPageSize(size);
    setPage(1);
  };

  const mutation = useAdminUserTypeUpdate();
  const exportMutation = useAdminUsersExport();

  const handleDownloadCsv = () => {
    exportMutation.mutate(undefined, {
      onSuccess: ({ blob, filename }) => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toaster.create({
          title: "Download started",
          description: filename,
          type: "success",
          duration: 3000,
        });
      },
      onError: (err) => {
        toaster.create({
          title: "Download failed",
          description: (err as Error)?.message || "Could not download CSV.",
          type: "error",
          duration: 5000,
        });
      },
    });
  };

  const handleChange = (user: ManagedUser, newType: AssignableUserType) => {
    mutation.mutate(
      { userId: user.id, userType: newType },
      {
        onSuccess: (updated) => {
          toaster.create({
            title: "User updated",
            description: `${updated.email} is now ${updated.userType}.`,
            type: "success",
            duration: 3000,
          });
        },
        onError: (err) => {
          toaster.create({
            title: "Update failed",
            description:
              (err as Error)?.message || "Could not update user type.",
            type: "error",
            duration: 5000,
          });
        },
      }
    );
  };

  const loading = (
    <Flex alignItems="center" gap={2} color="fg.muted">
      <Spinner size="sm" /> Loading users…
      {loadedSoFar > 0 && ` ${formatCount(loadedSoFar)} so far`}
    </Flex>
  );

  return (
    <Container
      maxW="full"
      py={12}
      display="flex"
      flexDirection="column"
      gap={6}
    >
      <Flex alignItems="center" justifyContent="space-between" gap={4}>
        <Flex alignItems="center" gap={2} color="fg.muted">
          <UsersThreeIcon size={24} />
          <Heading as="h1" size="2xl" fontWeight="normal">
            Manage Users
          </Heading>
        </Flex>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadCsv}
          loading={exportMutation.isPending}
          disabled={exportMutation.isPending}
        >
          <DownloadSimpleIcon />
          Download CSV
        </Button>
      </Flex>

      <UserFiltersBar
        filters={filters}
        onChange={updateFilters}
        countryOptions={countryOptions}
        sectorOptions={sectorOptions}
      />

      {list.isPending || (list.isError && list.isFetching) ? (
        loading
      ) : list.isError ? (
        // A failed refetch keeps the old list; don't show it as current.
        <Flex alignItems="center" gap={3}>
          <Text color="fg.error">
            {list.error.message || "Failed to load users."}
          </Text>
          <Button size="xs" variant="outline" onClick={() => list.refetch()}>
            Try again
          </Button>
        </Flex>
      ) : (
        <Flex direction="column" gap={3}>
          <Flex alignItems="center" gap={3} wrap="wrap" fontSize="sm">
            <Text aria-live="polite">
              {filtered
                ? `${formatCount(matches.length)} of ${usersLabel(list.data.length)}`
                : usersLabel(list.data.length)}
            </Text>
            {filtered && (
              <Button
                size="xs"
                variant="ghost"
                colorPalette="primary"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
            <Box ml="auto" color="fg.muted">
              {list.isFetching ? (
                loading
              ) : (
                <Text>Loaded at {formatLoadedAt(list.dataUpdatedAt)}</Text>
              )}
            </Box>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => list.refetch()}
              disabled={list.isFetching}
            >
              <ArrowClockwiseIcon />
              Refresh
            </Button>
          </Flex>

          {matches.length === 0 ? (
            <Flex
              direction="column"
              alignItems="center"
              gap={2}
              py={10}
              borderWidth="1px"
              borderColor="border"
              rounded="md"
              color="fg.muted"
            >
              <Text>No users match these filters.</Text>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="primary"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </Flex>
          ) : (
            <>
              <UsersTable
                users={shown.rows}
                sort={sort}
                onSort={sortBy}
                labels={labels}
                selfId={userId}
                typeCell={(user) => (
                  <UserTypeCell
                    user={user}
                    isSelf={user.id === userId}
                    isSaving={
                      mutation.isPending &&
                      mutation.variables?.userId === user.id
                    }
                    onChange={(to) => handleChange(user, to)}
                  />
                )}
              />
              <UsersPager
                first={shown.first}
                last={shown.last}
                total={matches.length}
                page={shown.page}
                lastPage={shown.lastPage}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={changePageSize}
              />
            </>
          )}
        </Flex>
      )}
    </Container>
  );
}
