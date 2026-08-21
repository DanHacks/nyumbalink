import { useMapProperties } from './useMapProperties';
import type { Viewport } from './MapCanvas';

/** National bounds — used by non-map screens (home, saved, search) that are not viewport-scoped. */
export const NATIONAL_VIEWPORT: Viewport = {
  south: -4.9,
  west: 33.8,
  north: 5.1,
  east: 41.9,
  zoom: 6,
  center: [-0.6, 36.8],
};

export function useAllProperties() {
  return useMapProperties(NATIONAL_VIEWPORT);
}