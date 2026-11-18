import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { toaster } from "@/app/components/ui/toaster";
import { saveUrl } from "@/src/shared/lib/download";
import {
  prepareAlertLocations,
  type AlertLocationsRequest,
} from "../api/alert-locations";
import { LOCATION_FORMATS } from "../lib/alertsWidgets";

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/** One file in preparation: the view it follows, its abort and its toast. */
interface Job {
  request: AlertLocationsRequest;
  controller: AbortController;
  toastId: string;
}

/**
 * The alerts widget's alert locations download: asks for the file, waits
 * while it is written, then saves it. A toast follows each file (design A1):
 * "Preparing" with a Cancel, then "Saved" or "Download failed" in its place.
 * The menu stays free, so a second file (the other format, another view)
 * gets a toast of its own.
 *
 * The filters are the ones on show at the click. A later change to the view
 * does not change a file in preparation. A card that unmounts (the dashboard
 * closed) drops its downloads and their toasts, so no file arrives out of
 * context. The toasts live on the hook, not on `mutate`, so an abort's error
 * still reaches the guard that silences it.
 */
export function useAlertLocationsDownload(): (
  request: AlertLocationsRequest
) => void {
  const [inFlight] = useState(() => new Set<AbortController>());
  useEffect(
    () => () => inFlight.forEach((controller) => controller.abort()),
    [inFlight]
  );

  const { mutate } = useMutation({
    mutationFn: ({ request, controller }: Job) =>
      prepareAlertLocations(request, controller.signal),
    onSuccess: (file, { toastId }) => {
      // The presigned URL's `Content-Disposition` names the file and makes it
      // a download, so the page stays where it is.
      saveUrl(file.url);
      toaster.update(toastId, {
        type: "success",
        title: `Saved ${COUNT_FORMAT.format(file.pointCount)} alert locations`,
        description: file.truncated
          ? "The file holds the newest alerts. The period has more."
          : undefined,
        duration: file.truncated ? 8000 : 4000,
        action: undefined,
      });
    },
    onError: (error, { controller, toastId }) => {
      if (controller.signal.aborted) {
        toaster.dismiss(toastId);
        return;
      }
      console.error("Alert locations download failed", error);
      toaster.update(toastId, {
        type: "error",
        title: "Download failed",
        description:
          "The alert locations file couldn't be prepared. Please try again.",
        duration: 5000,
        action: undefined,
      });
    },
    onSettled: (_file, _error, { controller }) => {
      inFlight.delete(controller);
    },
  });

  return (request) => {
    const controller = new AbortController();
    inFlight.add(controller);
    const toastId = toaster.create({
      type: "loading",
      title: "Preparing alert locations",
      description: `The ${LOCATION_FORMATS[request.format].file} saves when it is ready.`,
      action: { label: "Cancel", onClick: () => controller.abort() },
    });
    mutate({ request, controller, toastId });
  };
}
