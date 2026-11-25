import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/app/lib/api-client";

async function fetchAreaThumbnailUrl(
  source: string,
  srcId: string
): Promise<string> {
  const path = `/api/geometry/${encodeURIComponent(source)}/${encodeURIComponent(srcId)}/thumbnail`;
  // The route pads the outline by 40px, more than a card-sized image can fit,
  // so this takes the route's default size and the card scales it down.
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`Thumbnail request failed: ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

/**
 * Fetch the outline thumbnail the backend draws for an area, as an object
 * URL, or null until it loads or when it fails. The API authenticates with a
 * header, which an `<img src>` can't send, so the image is fetched here.
 */
export function useAreaThumbnail(source: string, srcId: string): string | null {
  const { data: url } = useQuery({
    queryKey: ["areaThumbnail", source, srcId],
    queryFn: () => fetchAreaThumbnailUrl(source, srcId),
    // One object URL per area for the session: an outline doesn't change while
    // the area keeps its id, and a URL kept in the cache is never revoked
    // while a card still shows it.
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return url ?? null;
}
