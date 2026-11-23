import { Badge, NativeSelect } from "@chakra-ui/react";
import type { AssignableUserType } from "@/app/schemas/api/admin/users/patch";
import { toSentenceCase } from "@/app/utils/formatText";
import type { ManagedUser } from "../lib/managed-user";
import { ASSIGNABLE_USER_TYPES } from "../lib/user-types";

export function UserTypeCell({
  user,
  shownType,
  isSelf,
  isSaving,
  onChange,
}: {
  user: ManagedUser;
  /** Differs from the user's type while a change is confirmed or saved. */
  shownType: string;
  isSelf: boolean;
  isSaving: boolean;
  onChange: (from: AssignableUserType, to: AssignableUserType) => void;
}) {
  // Machine accounts are set up by the backend, not changed here.
  if (user.userType === "machine") return <Badge size="sm">Machine</Badge>;
  const from = user.userType;

  return (
    <NativeSelect.Root size="xs" width="28" disabled={isSaving}>
      <NativeSelect.Field
        aria-label={`User type for ${user.email}`}
        value={shownType}
        onChange={(e) => {
          const to = ASSIGNABLE_USER_TYPES.find((t) => t === e.target.value);
          if (to) onChange(from, to);
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
