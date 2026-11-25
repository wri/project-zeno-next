import { Menu } from "@chakra-ui/react";
import { FloppyDiskIcon, XIcon } from "@phosphor-icons/react";

import { toaster } from "@/app/components/ui/toaster";
import type { Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import { listSavableAreas } from "@/app/utils/savableAreas";
import { useSaveUserAoi, useUserAois } from "@/src/entities/user-aoi";

import { AreaCardMenu } from "./AreaCardMenu";

/**
 * Kebab (⋮) menu for an "in this conversation" area card: save the area to the
 * user's areas, and remove it from the conversation.
 *
 * "Save area" mirrors the on-map AOI menu (`useAoiActions.saveArea`): it saves
 * each source area on the layer to the user's areas by reference, so no
 * geometry is copied. It only appears while the layer has a source area that
 * isn't saved yet; drawn and uploaded areas are already in "My areas".
 */
export default function ConversationAreaActionsMenu({
  layer,
}: {
  layer: Layer;
}) {
  const { saveUserAoiAsync, isSaving } = useSaveUserAoi();
  const { data: userAois = [] } = useUserAois();

  const name = layer.aoiSelection?.name ?? layer.name;
  const savable = listSavableAreas(layer, userAois);

  const handleSave = async () => {
    if (isSaving || savable.length === 0) return;
    const results = await Promise.allSettled(
      savable.map((area) => saveUserAoiAsync(area))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    toaster.create(
      failed === 0
        ? {
            title: "Area saved",
            description: `"${name}" is now in your areas.`,
            type: "success",
            duration: 3000,
          }
        : {
            title: "Couldn't save this area",
            description: "Please try again.",
            type: "error",
            duration: 4000,
          }
    );
  };

  const handleRemove = () => {
    useMapStore.getState().removeLayer(layer.id);
  };

  return (
    <AreaCardMenu label={`Actions for ${name}`}>
      {savable.length > 0 && (
        <Menu.Item
          value="save"
          color="fg.muted"
          onSelect={() => void handleSave()}
        >
          <FloppyDiskIcon />
          Save area
        </Menu.Item>
      )}
      <Menu.Item value="remove" color="fg.muted" onSelect={handleRemove}>
        <XIcon />
        Remove from conversation
      </Menu.Item>
    </AreaCardMenu>
  );
}
