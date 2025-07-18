import { create } from 'zustand';
import { MapRef } from 'react-map-gl/maplibre';
import bbox from '@turf/bbox';
import center from '@turf/center';
import { LayerId } from '../types/map';

interface GeoJsonFeature {
  id: string;
  name?: string;
  data: GeoJSON.FeatureCollection | GeoJSON.Feature;
}

interface MapState {
  mapRef: MapRef | null;
  geoJsonFeatures: GeoJsonFeature[];
  selectAreaLayer: LayerId | null;
  selectedAreas: GeoJSON.Feature[];
  setMapRef: (mapRef: MapRef) => void;
  setSelectAreaLayer: (layerId: LayerId | null) => void;
  addSelectedArea: (area: GeoJSON.Feature) => void;
  addGeoJsonFeature: (feature: GeoJsonFeature) => void;
  removeGeoJsonFeature: (id: string) => void;
  clearGeoJsonFeatures: () => void;
  flyToGeoJson: (geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature) => void;
  flyToCenter: (geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature, zoom?: number) => void;
  flyToGeoJsonWithRetry: (geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature, maxRetries?: number) => void;
}

const useMapStore = create<MapState>((set, get) => ({
  mapRef: null,
  geoJsonFeatures: [],
  selectAreaLayer: null,
  selectedAreas: [],

  setMapRef: (mapRef) => {
    console.log('Setting map ref:', !!mapRef);
    set({ mapRef });
  },

  setSelectAreaLayer: (layerId) => {
    set({ selectAreaLayer: layerId });
  },

  addSelectedArea: (area: GeoJSON.Feature) => {
    set((state) => ({ selectedAreas: [...state.selectedAreas, area]}));
  },

  addGeoJsonFeature: (feature) => {
    set((state) => ({
      geoJsonFeatures: [...state.geoJsonFeatures.filter(f => f.id !== feature.id), feature]
    }));
  },

  removeGeoJsonFeature: (id) => {
    set((state) => ({
      geoJsonFeatures: state.geoJsonFeatures.filter(f => f.id !== id)
    }));
  },

  clearGeoJsonFeatures: () => {
    set({ geoJsonFeatures: [] });
  },

  flyToGeoJson: (geoJson) => {
    const { mapRef } = get();
    if (!mapRef) {
      console.warn('Map ref not available for flying to GeoJSON');
      return;
    }

    try {
      // Use Turf.js bbox function to calculate bounding box
      const bboxArray = bbox(geoJson);
      // bbox returns [minX, minY, maxX, maxY] which is [west, south, east, north]
      const bounds: [[number, number], [number, number]] = [
        [bboxArray[0], bboxArray[1]], // southwest
        [bboxArray[2], bboxArray[3]]  // northeast
      ];

      const map = mapRef.getMap();

      // Fit the map to the bounds with some padding
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 16 // Prevent zooming in too much for very small areas
      });
    } catch (error) {
      console.error('Error flying to GeoJSON bounds:', error);
    }
  },

  flyToGeoJsonWithRetry: (geoJson, maxRetries = 5) => {
    const { mapRef, flyToGeoJson } = get();

    if (mapRef) {
      flyToGeoJson(geoJson);
      return;
    }

    if (maxRetries <= 0) {
      console.warn('Max retries reached, map ref still not available');
      return;
    }

    console.log(`Map ref not ready, retrying in 200ms (${maxRetries} retries left)`);
    setTimeout(() => {
      get().flyToGeoJsonWithRetry(geoJson, maxRetries - 1);
    }, 200);
  },

  flyToCenter: (geoJson, zoom = 12) => {
    const { mapRef } = get();
    if (!mapRef) {
      console.warn('Map ref not available for flying to center');
      return;
    }

    try {
      // Use Turf.js center function to calculate center point
      const centerPoint = center(geoJson);
      const [lng, lat] = centerPoint.geometry.coordinates;

      const map = mapRef.getMap();

      // Fly to the center point
      map.flyTo({
        center: [lng, lat],
        zoom: zoom,
        essential: true // This animation is considered essential for accessibility
      });
    } catch (error) {
      console.error('Error flying to GeoJSON center:', error);
    }
  }
}));

export default useMapStore;
