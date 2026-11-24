import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { apiFetch } from "@/app/lib/api-client";

async function fetchAreaThumbnail(
  source: string,
  srcId: string,
  size: number
): Promise<Blob> {
  const path = `/api/geometry/${encodeURIComponent(source)}/${encodeURIComponent(srcId)}/thumbnail`;
  const res = await apiFetch(`${path}?width=${size}&height=${size}`);
  if (!res.ok) throw new Error(`Thumbnail request failed: ${res.status}`);
  return res.blob();
}

/**
 * Fetch the outline thumbnail the backend draws for an area, as an object
 * URL, or null until it loads or when it fails. The API authenticates with a
 * header, which an `<img src>` can't send, so the image is fetched here.
 */
export function useAreaThumbnail(
  source: string,
  srcId: string,
  size: number
): string | null {
  const { data: blob } = useQuery({
    queryKey: ["areaThumbnail", source, srcId, size],
    queryFn: () => fetchAreaThumbnail(source, srcId, size),
    // An area's outline doesn't change while it keeps its id.
    staleTime: Infinity,
  });
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  // Release the image once the card stops showing it.
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}
