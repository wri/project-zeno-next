import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";

interface ExportResult {
  blob: Blob;
  filename: string;
}

function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? match[1] : null;
}

async function exportUsersCsv(): Promise<ExportResult> {
  const res = await apiFetch("/api/admin/users/export?format=csv");

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.error;
    } catch {}
    const errorWithStatus = new Error(
      detail || `Request failed: ${res.statusText}`
    );
    (errorWithStatus as Error & { status?: number }).status = res.status;
    throw errorWithStatus;
  }

  const filename = parseFilename(res.headers.get("Content-Disposition"));
  if (!filename) {
    throw new Error(
      "Server response was missing a filename. Please try again or contact support."
    );
  }

  const blob = await res.blob();
  return { blob, filename };
}

export function useAdminUsersExport() {
  return useMutation({ mutationFn: exportUsersCsv });
}
