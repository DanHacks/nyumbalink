export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function deltaToZoom(delta: number): number {
  if (!delta || delta <= 0) return 10;
  return Math.log2(360 / delta);
}

export function zoomToDelta(zoom: number): number {
  if (zoom == null || isNaN(zoom)) return 0.08;
  return 360 / Math.pow(2, zoom);
}

export interface MapCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  properties: import('./types').MapProperty[];
  isCluster: true;
}

export type ClusterOrProperty = MapCluster | import('./types').MapProperty;

/**
 * Lightweight geographic clustering so we never render thousands of
 * individual markers at once. Pure JS, zoom-aware.
 */
export function clusterProperties(
  items: import('./types').MapProperty[],
  zoom: number,
): ClusterOrProperty[] {
  if (!items || items.length === 0) return [];
  const radiusDeg = Math.max(0.004, zoomToDelta(zoom) * 0.12);
  const visited = new Set<string>();
  const result: ClusterOrProperty[] = [];

  for (const p of items) {
    if (visited.has(p.id)) continue;
    const group: import('./types').MapProperty[] = [p];
    visited.add(p.id);
    for (const q of items) {
      if (visited.has(q.id)) continue;
      const dLat = q.latitude - p.latitude;
      const dLng = (q.longitude - p.longitude) * Math.cos((p.latitude * Math.PI) / 180);
      if (Math.sqrt(dLat * dLat + dLng * dLng) < radiusDeg) {
        group.push(q);
        visited.add(q.id);
      }
    }
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const latitude = group.reduce((s, x) => s + x.latitude, 0) / group.length;
      const longitude = group.reduce((s, x) => s + x.longitude, 0) / group.length;
      result.push({
        id: `cluster-${p.id}`,
        latitude,
        longitude,
        count: group.length,
        properties: group,
        isCluster: true,
      });
    }
  }
  return result;
}

/**
 * External navigation link (OSM/Google Maps URL). This is NOT a Maps API call.
 */
export function externalDirectionsUrl(
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number; longitude: number },
): string {
  const destination = `${to.latitude},${to.longitude}`;
  const origin = from ? `&origin=${from.latitude},${from.longitude}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}`;
}

