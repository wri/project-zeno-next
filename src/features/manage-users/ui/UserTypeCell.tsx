import { Badge, NativeSelect } from "@chakra-ui/react";
import type { AssignableUserType } from "@/app/schemas/api/admin/users/patch";
import { toSentenceCase } from "@/app/utils/formatText";
import type { ManagedUser } from "../lib/managed-user";
import { ASSIGNABLE_USER_TYPES } from "../lib/user-types";

export function UserTypeCell({
  user,
  isSelf,
  isSaving,
  onChange,
}: {
  user: ManagedUser;
  isSelf: boolean;
  isSaving: boolean;
  onChange: (to: AssignableUserType) => void;
}) {
  // Machine accounts are set up by the backend, not changed here.
  if (user.userType === "machine") return <Badge size="sm">Machine</Badge>;

  return (
    <NativeSelect.Root size="xs" width="28" disabled={isSaving}>
      <NativeSelect.Field
        aria-label={`User type for ${user.email}`}
        value={user.userType}
        onChange={(e) => {
          const to = ASSIGNABLE_USER_TYPES.find((t) => t === e.target.value);
          if (to) onChange(to);
        }}
      >
        {ASSIGNABLE_USER_TYPES.map((t) => (
          // Self-demote guard: the backend rejects it; disabled here too.
          <option key={t} value={t} disabled={isSelf && t !== "superuser"}>
            {toSentenceCase(t)}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}
