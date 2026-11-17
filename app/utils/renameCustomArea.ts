import type { CustomArea } from "@/app/schemas/api/custom_areas/get";
import useChatStore from "@/app/store/chatStore";
import {
  sameFeatureRef,
  type FeatureRef,
  type GeoJsonEntry,
  type Layer,
} from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import type { AOISelection } from "@/app/types/chat";
import { useSelectionStore } from "@/src/features/analysis";

const isCustomSource = (source: string) => source.toLowerCase() === "custom";

const isRenamedArea = (
  areaId: string,
  a: { source: string; srcId?: string }
): boolean => a.srcId === areaId && isCustomSource(a.source);

/**
 * Renames the AOIs in a selection that are the renamed area. A selection that
 * was labelled by the area's old name (a single-area pick) takes the new name;
 * a multi-area selection keeps its own label.
 */
function renameInSelection(
  selection: AOISelection,
  areaId: string,
  name: string
): AOISelection {
  const renamed = selection.aois.filter((aoi) =>
    isRenamedArea(areaId, { source: aoi.source, srcId: aoi.src_id })
  );
  if (renamed.length === 0) return selection;
  return {
    name: renamed.some((aoi) => aoi.name === selection.name)
      ? name
      : selection.name,
    aois: selection.aois.map((aoi) =>
      renamed.includes(aoi) ? { ...aoi, name } : aoi
    ),
  };
}

/**
 * Carries a saved custom area's new name into every client-side copy of it.
 * The custom-areas query refetches the My areas list, but the map keeps its
 * own copies of the name: the area layer's label, the feature refs that key
 * its geometry in the registry, the analysis selection, and the area cards
 * the agent posted in chat.
 *
 * The area is matched by its id (`srcId` with source "custom"), never by its
 * old name, which another area may share.
 */
export function renameCustomArea(area: Pick<CustomArea, "id" | "name">): void {
  const { id: areaId, name } = area;
  const { geoJsonRegistry, layers, analysisSelection } = useMapStore.getState();

  const renamedRefs = geoJsonRegistry
    .filter((e) =>
      isRenamedArea(areaId, { source: e.ref.source, srcId: e.srcId })
    )
    .map((e) => e.ref);
  const oldNames = new Set(renamedRefs.map((r) => r.name));
  const renameRef = (ref: FeatureRef): FeatureRef =>
    renamedRefs.some((r) => sameFeatureRef(r, ref)) ? { ...ref, name } : ref;

  const renameLayer = (layer: Layer): Layer => {
    const featureRefs = layer.featureRefs?.map(renameRef);
    const aoiSelection =
      layer.aoiSelection && renameInSelection(layer.aoiSelection, areaId, name);
    const touched =
      layer.id === areaId ||
      aoiSelection !== layer.aoiSelection ||
      featureRefs?.some((ref, i) => ref !== layer.featureRefs?.[i]);
    if (!touched) return layer;
    // A label that was the area's name follows it; a label taken from a
    // multi-area selection stays (see renameInSelection).
    const relabel = (label: string) => {
      if (aoiSelection && label === layer.aoiSelection?.name) {
        return aoiSelection.name;
      }
      return layer.id === areaId || oldNames.has(label) ? name : label;
    };
    return {
      ...layer,
      name: relabel(layer.name),
      selectionName: layer.selectionName && relabel(layer.selectionName),
      featureRefs,
      aoiSelection,
    };
  };

  useMapStore.setState({
    geoJsonRegistry: geoJsonRegistry.map(
      (e): GeoJsonEntry =>
        renamedRefs.includes(e.ref) ? { ...e, ref: renameRef(e.ref) } : e
    ),
    layers: layers.map(renameLayer),
    analysisSelection:
      analysisSelection && isRenamedArea(areaId, analysisSelection)
        ? { ...analysisSelection, name }
        : analysisSelection,
  });

  const { selection, select } = useSelectionStore.getState();
  if (selection && isRenamedArea(areaId, selection)) {
    select({ ...selection, name });
  }

  useChatStore.setState((state) => ({
    messages: state.messages.map((m) => {
      if (m.type !== "area-card" || !m.aoiSelection) return m;
      const aoiSelection = renameInSelection(m.aoiSelection, areaId, name);
      return aoiSelection === m.aoiSelection ? m : { ...m, aoiSelection };
    }),
  }));
}
