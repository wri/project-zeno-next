import { Suspense, useMemo, useState } from "react";
import { Button, Stack, Text } from "@chakra-ui/react";

import { toaster } from "@/app/components/ui/toaster";
import { useCustomAreasListSuspense } from "@/app/hooks/useCustomAreasList";
import useMapStore from "@/app/store/mapStore";
import {
  addPlaceToMap,
  findPlaceLayer,
  removePlaceFromMap,
} from "@/app/utils/addPlaceToMap";
import {
  AOI_SEARCH_DEBOUNCE_MS,
  AOI_SEARCH_MIN_CHARS,
  REFERENCE_AOI_SOURCE_LABELS,
  REFERENCE_AOI_SOURCES,
  placeMeta,
  placeToAoi,
  useAoiSearch,
  type AoiSearchResult,
  type ReferenceAoiSource,
} from "@/src/entities/aoi";
import { useDebounced } from "@/src/shared/lib/use-debounced";
import { EntityCard } from "@/src/shared/ui/entity-card";

import { MonitoredAreaCard } from "./AreaLists";
import { AreaThumbnail } from "./AreaThumbnail";
import { PanelEmpty, PanelList, PanelPills, PanelSection } from "./PanelList";

/** What a search covers: every boundary set, one of them, or your own areas. */
type SearchScope = "all" | ReferenceAoiSource | "mine";

/** The boundary sets double as filters: a set is a pill, a place is a row. */
const SCOPE_PILLS: { id: SearchScope; label: string }[] = [
  { id: "all", label: "All" },
  ...REFERENCE_AOI_SOURCES.map((source) => ({
    id: source,
    label: REFERENCE_AOI_SOURCE_LABELS[source],
  })),
  { id: "mine", label: "My areas" },
];

/**
 * The Areas panel while a query is typed: the tabs give way to scope pills,
 * your saved areas that match come first, then the backend's ranked places
 * across the boundary sets (one request for "All", so the best match leads
 * whichever set it's from).
 */
export function AreaSearchResults({ query }: { query: string }) {
  const [scope, setScope] = useState<SearchScope>("all");
  const term = query.trim();

  return (
    <>
      <PanelPills options={SCOPE_PILLS} value={scope} onChange={setScope} />
      <Stack gap={4} flex={1} minH={0} minW={0} pb={2} overflowY="auto">
        {(scope === "all" || scope === "mine") && (
          <SavedMatches term={term} showEmpty={scope === "mine"} />
        )}
        {scope !== "mine" && (
          <PlaceMatches
            query={query}
            sources={scope === "all" ? REFERENCE_AOI_SOURCES : [scope]}
          />
        )}
      </Stack>
    </>
  );
}

function SavedMatches({
  term,
  showEmpty = false,
}: {
  term: string;
  /** "My areas" pill: say so when nothing matches (under All, stay quiet). */
  showEmpty?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <SavedMatchList term={term} showEmpty={showEmpty} />
    </Suspense>
  );
}

function SavedMatchList({
  term,
  showEmpty,
}: {
  term: string;
  showEmpty: boolean;
}) {
  const { customAreas } = useCustomAreasListSuspense();
  const matches = useMemo(() => {
    const q = term.toLowerCase();
    return customAreas.filter((a) => a.name.toLowerCase().includes(q));
  }, [customAreas, term]);

  if (matches.length === 0) {
    return showEmpty ? (
      <PanelEmpty>None of your areas match “{term}”.</PanelEmpty>
    ) : null;
  }
  return (
    <PanelSection label="My areas">
      <PanelList>
        {matches.map((area) => (
          <MonitoredAreaCard key={area.id} area={area} />
        ))}
      </PanelList>
    </PanelSection>
  );
}

function PlaceMatches({
  query,
  sources,
}: {
  query: string;
  sources: readonly ReferenceAoiSource[];
}) {
  const debounced = useDebounced(query, AOI_SEARCH_DEBOUNCE_MS);
  const search = useAoiSearch(debounced, sources);
  const term = query.trim();

  if (term.length < AOI_SEARCH_MIN_CHARS) {
    return (
      <PanelEmpty>
        Type at least {AOI_SEARCH_MIN_CHARS} characters to search places.
      </PanelEmpty>
    );
  }
  if (search.isError) {
    return (
      <Stack gap={1} mt={4} align="flex-start">
        <Text fontSize="sm" color="fg.muted">
          Couldn&apos;t search places.
        </Text>
        <Button
          variant="plain"
          size="sm"
          p={0}
          color="fg.link"
          onClick={() => void search.refetch()}
        >
          Try again
        </Button>
      </Stack>
    );
  }
  // No results yet for any term (the first search, or the debounce window).
  if (!search.data) return <PanelEmpty>Searching places…</PanelEmpty>;

  const places = search.data.pages.flatMap((page) => page.results);
  if (places.length === 0) {
    return <PanelEmpty>No places match “{debounced.trim()}”.</PanelEmpty>;
  }
  return (
    <PanelSection label="Places">
      <PanelList>
        {places.map((place) => (
          <PlaceRow key={`${place.source}:${place.src_id}`} place={place} />
        ))}
      </PanelList>
      {search.hasNextPage && (
        <Button
          variant="plain"
          size="sm"
          p={0}
          alignSelf="flex-start"
          color="fg.link"
          loading={search.isFetchingNextPage}
          onClick={() => void search.fetchNextPage()}
        >
          Show more places
        </Button>
      )}
    </PanelSection>
  );
}

function PlaceRow({ place }: { place: AoiSearchResult }) {
  const aoi = useMemo(() => placeToAoi(place), [place]);
  const aoiSelection = useMemo(() => ({ name: aoi.name, aois: [aoi] }), [aoi]);
  const layer = useMapStore((s) => findPlaceLayer(s.layers, place));
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const [adding, setAdding] = useState(false);
  // A place hidden from "In this conversation" is still on the map, but off.
  const isVisible = !!layer?.visible;

  async function handleToggle(checked: boolean) {
    if (!checked) {
      if (layer) removePlaceFromMap(layer, aoi);
      return;
    }
    if (layer) {
      setLayerVisibility(layer.id, true);
      return;
    }
    setAdding(true);
    try {
      await addPlaceToMap(aoi);
    } catch (error) {
      console.error(`Failed to add "${aoi.name}" to the map:`, error);
      toaster.create({
        type: "error",
        title: "Couldn't add this area",
        description: `"${aoi.name}" couldn't be loaded. Please try again.`,
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <EntityCard
      kind="area"
      thumbnail={<AreaThumbnail aoiSelection={aoiSelection} alt={aoi.name} />}
      title={aoi.name}
      meta={placeMeta(place)}
      interaction={{
        mode: "toggle",
        checked: isVisible || adding,
        onChange: (checked) => void handleToggle(checked),
        status: adding ? "Adding…" : undefined,
        disabled: adding,
        dataPanel: "areas-places",
      }}
    />
  );
}
