import { Image } from "@chakra-ui/react";
import { useMemo } from "react";

import { useAreaThumbnail } from "@/app/hooks/useAreaThumbnail";
import { userAoiToAoi, type UserAoi } from "@/src/entities/user-aoi";

import { AreaThumbnail } from "./AreaThumbnail";

/**
 * Thumbnail for a "My areas" card: the area's outline, drawn by the backend
 * because the user AOI list carries no geometry. Until it loads, or if it
 * can't, the plain area thumbnail stands in.
 */
export function UserAoiThumbnail({ userAoi }: { userAoi: UserAoi }) {
  const outlineUrl = useAreaThumbnail(userAoi.source, userAoi.src_id);
  const aoiSelection = useMemo(() => {
    const aoi = userAoiToAoi(userAoi);
    return { name: aoi.name, aois: [aoi] };
  }, [userAoi]);

  if (!outlineUrl) {
    return <AreaThumbnail aoiSelection={aoiSelection} alt={userAoi.name} />;
  }
  return (
    <Image
      src={outlineUrl}
      alt={userAoi.name}
      w="100%"
      h="100%"
      objectFit="cover"
    />
  );
}
