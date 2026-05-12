import { useState } from "react";
import { toaster } from "@/app/components/ui/toaster";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      toaster.create({
        title: "Logging out",
        description: "Signing you out and redirecting…",
        type: "info",
        duration: 8000,
      });
    } catch {}
    (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/";
    })();
  };

  return { logout, isLoggingOut };
}
