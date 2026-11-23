import { useRef, useState } from "react";
import { toaster } from "@/app/components/ui/toaster";
import type { AssignableUserType } from "@/app/schemas/api/admin/users/patch";
import { toSentenceCase } from "@/app/utils/formatText";
import {
  useAdminUserTypeUpdate,
  usePendingUserTypes,
} from "../api/admin-user-type-update";
import type { ManagedUser } from "../lib/managed-user";

export interface TypeChange {
  user: ManagedUser;
  from: AssignableUserType;
  to: AssignableUserType;
}

/**
 * A change to or from superuser waits for a confirm. Any other change saves
 * at once, and its toast offers Undo.
 */
export function useUserTypeChange() {
  const { mutateAsync } = useAdminUserTypeUpdate();
  const saving = usePendingUserTypes();
  const [confirming, setConfirming] = useState<TypeChange | null>(null);
  // A newer change to the same user makes an older Undo wrong; close it.
  const undoToasts = useRef(new Map<string, string>());

  const save = async ({ user, from, to }: TypeChange, undoable: boolean) => {
    const stale = undoToasts.current.get(user.id);
    if (stale) {
      toaster.dismiss(stale);
      undoToasts.current.delete(user.id);
    }
    try {
      await mutateAsync({ userId: user.id, userType: to });
    } catch (err) {
      toaster.create({
        title: "Update failed",
        description: (err as Error).message || "Could not update user type.",
        type: "error",
        duration: 5000,
      });
      return;
    }
    const id = toaster.create({
      title: "User updated",
      description: `${user.email} is now ${toSentenceCase(to)}.`,
      type: "success",
      duration: undoable ? 6000 : 3000,
      action: undoable
        ? {
            label: "Undo",
            onClick: () => save({ user, from: to, to: from }, false),
          }
        : undefined,
    });
    if (undoable) undoToasts.current.set(user.id, id);
  };

  return {
    /** The type a row shows: the one being confirmed or saved, else its own. */
    shownType: (user: ManagedUser) =>
      confirming?.user.id === user.id
        ? confirming.to
        : (saving.get(user.id) ?? user.userType),
    isSaving: (user: ManagedUser) => saving.has(user.id),
    request: (change: TypeChange) => {
      if (change.from === "superuser" || change.to === "superuser") {
        setConfirming(change);
      } else {
        save(change, true);
      }
    },
    confirming,
    confirm: () => {
      if (confirming) save(confirming, false);
      setConfirming(null);
    },
    cancel: () => setConfirming(null),
  };
}
