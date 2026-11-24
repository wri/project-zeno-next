import { Image } from "@chakra-ui/react";
import { useMemo } from "react";

import { useAreaThumbnail } from "@/app/hooks/useAreaThumbnail";
import { userAoiToAoi, type UserAoi } from "@/src/entities/user-aoi";

import { AreaThumbnail } from "./AreaThumbnail";

/**
 * Thumbnail for a "My areas" card: the area's outline, drawn by the backend
 * because the library list carries no geometry. Until it loads, or if it
 * can't, the plain area thumbnail stands in.
 */
export function LibraryAreaThumbnail({ entry }: { entry: UserAoi }) {
  const outlineUrl = useAreaThumbnail(entry.source, entry.src_id);
  const aoiSelection = useMemo(() => {
    const aoi = userAoiToAoi(entry);
    return { name: aoi.name, aois: [aoi] };
  }, [entry]);

  if (!outlineUrl) {
    return <AreaThumbnail aoiSelection={aoiSelection} alt={entry.name} />;
  }
  return (
    <Image
      src={outlineUrl}
      alt={entry.name}
      w="100%"
      h="100%"
      objectFit="cover"
    />
  );
}
