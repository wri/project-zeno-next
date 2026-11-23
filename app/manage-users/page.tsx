import SettingsShell from "@/app/components/SettingsShell";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { ManageUsersScreen } from "@/src/features/manage-users";

export default function ManageUsersPage() {
  const isReady = useAuthGuard();

  if (!isReady) return null;

  return (
    <SettingsShell activePath="/manage-users">
      <ManageUsersScreen />
    </SettingsShell>
  );
}
