import { useMemo, useState } from "react";
import {
  Button,
  Container,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  Portal,
  Select,
  Spinner,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import { DownloadSimpleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import useAuthStore from "@/app/store/authStore";
import SettingsShell from "@/app/components/SettingsShell";
import { useAdminUsersExport } from "@/app/hooks/useAdminUsersExport";
import { toaster } from "@/app/components/ui/toaster";
import {
  UserTypeEnum,
  type UserModel,
  type UserType,
} from "@/app/schemas/api/admin/users/get";
import {
  AssignableUserTypeEnum,
  type AssignableUserType,
} from "@/app/schemas/api/admin/users/patch";
import {
  filterUsers,
  useAdminUserTypeUpdate,
  useAdminUsersList,
  type UserFilters,
} from "@/src/features/manage-users";

const ASSIGNABLE_TYPES = AssignableUserTypeEnum.options;

// Rows rendered at a time: each row mounts its own type menu.
const ROWS_PER_PAGE = 50;

const NO_FILTERS: UserFilters = { query: "", userType: "all", audience: "all" };

const typeLabel = (t: UserType) => t.charAt(0).toUpperCase() + t.slice(1);

const formatCount = (n: number) => n.toLocaleString("en-US");

type ValueChangeDetails = { value: string[] };

function UserTypeSelect({
  user,
  isSelf,
  isPending,
  onChange,
}: {
  user: UserModel;
  isSelf: boolean;
  isPending: boolean;
  onChange: (newType: AssignableUserType) => void;
}) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: ASSIGNABLE_TYPES.map((t) => ({
          label: typeLabel(t),
          value: t,
        })),
        // Self-demote guard: backend rejects, but disable here for clearer UX.
        isItemDisabled: (item) => isSelf && item.value !== "superuser",
      }),
    [isSelf]
  );

  return (
    <Select.Root
      collection={collection}
      size="sm"
      width="180px"
      value={[user.userType]}
      disabled={isPending || user.userType === "machine"}
      onValueChange={(d: ValueChangeDetails) => {
        const newType = d.value[0] as AssignableUserType | undefined;
        if (newType && newType !== user.userType) {
          onChange(newType);
        }
      }}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item) => (
              <Select.Item item={item} key={item.value}>
                {item.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

export default function ManageUsersPage() {
  const isReady = useAuthGuard();
  const { userId } = useAuthStore();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [rowsShown, setRowsShown] = useState(ROWS_PER_PAGE);

  const { data, isPending, isError, error } = useAdminUsersList();
  const matches = useMemo(
    () => (data ? filterUsers(data, filters) : []),
    [data, filters]
  );

  const updateFilters = (patch: Partial<UserFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setRowsShown(ROWS_PER_PAGE);
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

  const handleChange = (user: UserModel, newType: AssignableUserType) => {
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

  if (!isReady) return null;

  return (
    <SettingsShell activePath="/manage-users">
      <Container
        maxW="4xl"
        display="flex"
        flexDirection="column"
        py={16}
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

        <Flex gap={3} wrap="wrap" alignItems="flex-end">
          <Field.Root id="search" maxW="sm" flex="1" minW="200px">
            <Field.Label>Search</Field.Label>
            <Input
              type="search"
              placeholder="Email or name"
              value={filters.query}
              onChange={(e) => updateFilters({ query: e.target.value })}
            />
          </Field.Root>
          <Field.Root id="user-type" width="auto">
            <Field.Label>User type</Field.Label>
            <NativeSelect.Root width="auto">
              <NativeSelect.Field
                value={filters.userType}
                onChange={(e) =>
                  updateFilters({
                    userType: e.target.value as UserFilters["userType"],
                  })
                }
              >
                <option value="all">All types</option>
                {UserTypeEnum.options.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root id="audience" width="auto">
            <Field.Label>Internal or external</Field.Label>
            <NativeSelect.Root width="auto">
              <NativeSelect.Field
                value={filters.audience}
                onChange={(e) =>
                  updateFilters({
                    audience: e.target.value as UserFilters["audience"],
                  })
                }
              >
                <option value="all">All users</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </Flex>

        {data && (
          // The container's gap is wider than this line needs; pull the
          // list up to sit close under the count.
          <Text color="fg.muted" fontSize="sm" aria-live="polite" mb={-3}>
            {matches.length === data.length
              ? `${formatCount(data.length)} users`
              : `${formatCount(matches.length)} of ${formatCount(data.length)} users`}
          </Text>
        )}
        {isPending ? (
          <Flex alignItems="center" gap={2} color="fg.muted">
            <Spinner size="sm" /> Loading users…
          </Flex>
        ) : isError ? (
          <Text color="fg.error">
            {(error as Error)?.message || "Failed to load users."}
          </Text>
        ) : matches.length === 0 ? (
          <Text color="fg.muted">No users match these filters.</Text>
        ) : (
          <Flex direction="column" gap={2}>
            {matches.slice(0, rowsShown).map((user) => {
              const isSelf = user.id === userId;
              const isUpdating =
                mutation.isPending && mutation.variables?.userId === user.id;
              return (
                <Flex
                  key={user.id}
                  alignItems="center"
                  justifyContent="space-between"
                  p={4}
                  borderWidth="1px"
                  borderColor="border"
                  rounded="md"
                  gap={4}
                >
                  <Flex direction="column" minW={0} flex="1">
                    <Text fontWeight="medium" truncate>
                      {user.email}
                      {isSelf && (
                        <Text as="span" color="fg.muted" fontWeight="normal">
                          {" "}
                          (you)
                        </Text>
                      )}
                    </Text>
                    {user.name && (
                      <Text color="fg.muted" fontSize="sm" truncate>
                        {user.name}
                      </Text>
                    )}
                  </Flex>
                  <UserTypeSelect
                    user={user}
                    isSelf={isSelf}
                    isPending={isUpdating}
                    onChange={(newType) => handleChange(user, newType)}
                  />
                </Flex>
              );
            })}
          </Flex>
        )}
        {rowsShown < matches.length && (
          <Button
            alignSelf="flex-start"
            size="sm"
            variant="outline"
            mt={-3}
            onClick={() => setRowsShown((n) => n + ROWS_PER_PAGE)}
          >
            Show more
          </Button>
        )}
      </Container>
    </SettingsShell>
  );
}
