import 'leaflet';

declare module 'leaflet' {
  interface Map {
    setBearing(bearingDegrees: number): void;
    getBearing(): number;
    touchRotate: {
      enable(): void;
      disable(): void;
      enabled(): boolean;
    };
    compassBearing: {
      enable(): void;
      disable(): void;
      enabled(): boolean;
    };
  }

  interface MapOptions {
    rotateControl?: boolean | object;
    touchRotate?: boolean;
  }
}

declare module 'leaflet-rotate';