import { useState } from "react";
import { toaster } from "@/app/components/ui/toaster";
import { clearToken } from "@/app/lib/api-client";

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
    clearToken();
    window.location.href = "/";
  };

  return { logout, isLoggingOut };
}
