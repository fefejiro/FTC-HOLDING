declare module 'react-leaflet' {
  import type { ComponentType, ReactNode } from 'react';

  export const CircleMarker: ComponentType<any>;
  export const MapContainer: ComponentType<any>;
  export const Polyline: ComponentType<any>;
  export const Popup: ComponentType<any>;
  export const TileLayer: ComponentType<any>;
  export const Tooltip: ComponentType<any>;

  export function useMap(): any;

  export type ReactLeafletChildren = ReactNode;
}
