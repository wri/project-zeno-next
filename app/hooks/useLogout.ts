import { useState } from "react";
import { toaster } from "@/app/components/ui/toaster";
import { clearToken } from "@/app/lib/api-client";
import { API_CONFIG } from "@/app/config/api";

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
    } catch (error) {
      console.error("Failed to show logout toast:", error);
    }
    clearToken();
    const url = new URL(`${API_CONFIG.RW_API_HOST}/auth/logout`);
    url.searchParams.set("callbackUrl", `${window.location.origin}/`);
    url.searchParams.set("origin", "gnw");
    window.location.href = url.toString();
  };

  return { logout, isLoggingOut };
}
