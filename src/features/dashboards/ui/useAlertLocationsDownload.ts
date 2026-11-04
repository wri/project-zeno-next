import { useEffect, useRef, useState } from "react";

import { toaster } from "@/app/components/ui/toaster";
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
 * closed) drops its download, so no file arrives out of context.
 */
export function useAlertLocationsDownload(): {
  download: (request: AlertLocationsRequest) => void;
  isPreparing: boolean;
} {
  const [isPreparing, setPreparing] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), []);

  const download = (request: AlertLocationsRequest) => {
    const controller = new AbortController();
    inFlight.current = controller;
    setPreparing(true);
    prepareAlertLocations(request, controller.signal)
      .then((file) => {
        saveFromUrl(file.url);
        if (file.truncated) {
          toaster.create({
            title: "Only the newest alerts",
            description: `The file holds the newest ${COUNT_FORMAT.format(file.pointCount)} alerts. The period has more.`,
            type: "info",
            duration: 8000,
          });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Alert locations download failed", error);
        toaster.create({
          title: "Download failed",
          description:
            "The alert locations file couldn't be prepared. Please try again.",
          type: "error",
          duration: 5000,
        });
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        inFlight.current = null;
        setPreparing(false);
      });
  };

  return { download, isPreparing };
}

/**
 * Saves the file at `url` through the browser. The presigned URL's
 * `Content-Disposition` makes it a download with the file's name, so the
 * page stays where it is.
 */
function saveFromUrl(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  // In the document for the click, as some browsers ignore a detached anchor.
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
  }
}
