import "leaflet";

// `leaflet-rotate` patches these onto L.Map/L.Map options at runtime (see
// Map.tsx) — this just tells TypeScript about the extra surface it adds.
declare module "leaflet" {
  interface MapOptions {
    rotate?: boolean;
    bearing?: number;
    touchRotate?: boolean;
    shiftKeyRotate?: boolean;
    rotateControl?: boolean | Record<string, unknown>;
  }

  interface Map {
    setBearing(degrees: number): void;
    getBearing(): number;
  }

  namespace DomUtil {
    const RAD_TO_DEG: number;
    const DEG_TO_RAD: number;
  }
}
