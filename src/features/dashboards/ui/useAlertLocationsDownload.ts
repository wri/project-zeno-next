import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { toaster } from "@/app/components/ui/toaster";
import { saveUrl } from "@/src/shared/lib/download";
import {
  prepareAlertLocations,
  type AlertLocationsRequest,
} from "../api/alert-locations";

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/**
 * The alerts widget's alert locations download: asks for the file, waits
 * while it is written (`isPreparing`), then saves it. A failure and a file
 * cut at the export's cap each show a toast.
 *
 * The filters are the ones on show at the click. A later change to the view
 * does not change a file in preparation. A card that unmounts (the dashboard
 * closed) drops its download, so no file arrives out of context. The toasts
 * live on the hook, not on `mutate`, so the abort's error still reaches the
 * guard that silences it.
 */
export function useAlertLocationsDownload(): {
  download: (request: AlertLocationsRequest) => void;
  isPreparing: boolean;
} {
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), []);

  const { mutate, isPending } = useMutation({
    mutationFn: (request: AlertLocationsRequest) => {
      inFlight.current = new AbortController();
      return prepareAlertLocations(request, inFlight.current.signal);
    },
    onSuccess: (file) => {
      // The presigned URL's `Content-Disposition` names the file and makes it
      // a download, so the page stays where it is.
      saveUrl(file.url);
      if (file.truncated) {
        toaster.create({
          title: "Only the newest alerts",
          description: `The file holds the newest ${COUNT_FORMAT.format(file.pointCount)} alerts. The period has more.`,
          type: "info",
          duration: 8000,
        });
      }
    },
    onError: (error) => {
      if (inFlight.current?.signal.aborted) return;
      console.error("Alert locations download failed", error);
      toaster.create({
        title: "Download failed",
        description:
          "The alert locations file couldn't be prepared. Please try again.",
        type: "error",
        duration: 5000,
      });
    },
  });

  return { download: mutate, isPreparing: isPending };
}
