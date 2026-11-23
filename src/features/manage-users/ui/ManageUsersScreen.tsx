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
import { toaster } from "@/app/components/ui/toaster";
import { downloadCsv } from "@/src/shared/lib/csv";
import { useAdminUsersList } from "../api/admin-users-list";
import { useProfileLabels } from "../api/profile-labels";
import {
  NO_FILTERS,
  codeOptions,
  filterUsers,
  hasFilters,
  type UserFilters,
} from "../lib/filter-users";
import { formatCount, formatLoadedAt, usersLabel } from "../lib/format";
import { DEFAULT_PAGE_SIZE, pageOf, type PageSize } from "../lib/paging";
import {
  DEFAULT_SORT,
  nextSort,
  sortUsers,
  type SortKey,
} from "../lib/sort-users";
import { usersCsvFilename, usersToCsv } from "../lib/users-csv";
import { SuperuserConfirmDialog } from "./SuperuserConfirmDialog";
import { UserFiltersBar } from "./UserFiltersBar";
import { UserTypeCell } from "./UserTypeCell";
import { UsersPager } from "./UsersPager";
import { UsersTable } from "./UsersTable";
import { useUserTypeChange } from "./useUserTypeChange";

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

  const typeChange = useUserTypeChange();

  // Every matching row, in the table's order, not only the current page.
  const handleDownload = () => {
    const filename = usersCsvFilename(filtered);
    try {
      downloadCsv(usersToCsv(matches.map((u) => u.wire)), filename);
    } catch (err) {
      toaster.create({
        title: "Download failed",
        description: (err as Error).message || "Could not download CSV.",
        type: "error",
        duration: 5000,
      });
      return;
    }
    toaster.create({
      title: "Download started",
      description: `${usersLabel(matches.length)}, as loaded at ${formatLoadedAt(list.dataUpdatedAt)}.`,
      type: "success",
      duration: 3000,
    });
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
          onClick={handleDownload}
          disabled={list.isError || matches.length === 0}
        >
          <DownloadSimpleIcon />
          {filtered
            ? `Download ${usersLabel(matches.length)} (CSV)`
            : "Download CSV"}
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
                    shownType={typeChange.shownType(user)}
                    isSelf={user.id === userId}
                    isSaving={typeChange.isSaving(user)}
                    onChange={(from, to) =>
                      typeChange.request({ user, from, to })
                    }
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

      <SuperuserConfirmDialog
        change={typeChange.confirming}
        onConfirm={typeChange.confirm}
        onCancel={typeChange.cancel}
      />
    </Container>
  );
}
