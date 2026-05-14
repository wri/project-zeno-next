"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Field,
  Flex,
  Heading,
  Input,
  Portal,
  Select,
  Spinner,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import { UsersThreeIcon } from "@phosphor-icons/react";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import useAuthStore from "@/app/store/authStore";
import SettingsShell from "@/app/components/SettingsShell";
import { useAdminUsersList } from "@/app/hooks/useAdminUsersList";
import { useAdminUserTypeUpdate } from "@/app/hooks/useAdminUserTypeUpdate";
import { toaster } from "@/app/components/ui/toaster";
import { type UserModel } from "@/app/schemas/api/admin/users/get";
import { type AssignableUserType } from "@/app/schemas/api/admin/users/patch";

const ASSIGNABLE_TYPES: AssignableUserType[] = [
  "regular",
  "pro",
  "admin",
  "superuser",
];

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
          label: t.charAt(0).toUpperCase() + t.slice(1),
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
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError, error } = useAdminUsersList(debouncedQuery);
  const mutation = useAdminUserTypeUpdate();

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

  const trimmedQuery = debouncedQuery.trim();

  return (
    <SettingsShell activePath="/manage-users">
      <Container
        maxW="4xl"
        display="flex"
        flexDirection="column"
        py={16}
        gap={6}
      >
        <Flex alignItems="center" gap={2} color="fg.muted">
          <UsersThreeIcon size={24} />
          <Heading as="h1" size="2xl" fontWeight="normal">
            Manage Users
          </Heading>
        </Flex>

        <Field.Root id="search" maxW="md">
          <Field.Label>Search by email</Field.Label>
          <Input
            type="search"
            placeholder="Type an email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field.Root>

        {trimmedQuery.length === 0 ? (
          <Text color="fg.muted">Type an email to search for a user.</Text>
        ) : isLoading ? (
          <Flex alignItems="center" gap={2} color="fg.muted">
            <Spinner size="sm" /> Loading users…
          </Flex>
        ) : isError ? (
          <Text color="fg.error">
            {(error as Error)?.message || "Failed to load users."}
          </Text>
        ) : !data || data.length === 0 ? (
          <Text color="fg.muted">No users match that email.</Text>
        ) : (
          <Flex direction="column" gap={2}>
            {data.map((user) => {
              const isSelf = user.id === userId;
              const isPending =
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
                    isPending={isPending}
                    onChange={(newType) => handleChange(user, newType)}
                  />
                </Flex>
              );
            })}
          </Flex>
        )}
      </Container>
    </SettingsShell>
  );
}
