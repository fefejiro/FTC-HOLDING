import * as Network from "expo-network";

export type ConnectivitySnapshot = Readonly<{
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}>;

export type ConnectivitySubscription = Readonly<{ remove: () => void }>;

export type ConnectivityMonitor = Readonly<{
  getCurrent: () => Promise<ConnectivitySnapshot>;
  subscribe: (listener: (snapshot: ConnectivitySnapshot) => void) => ConnectivitySubscription;
}>;

export function usableConnectivity(snapshot: ConnectivitySnapshot): boolean | undefined {
  if (snapshot.isConnected === false || snapshot.isInternetReachable === false) return false;
  if (snapshot.isConnected === true) return true;
  return undefined;
}

export const expoConnectivityMonitor: ConnectivityMonitor = {
  getCurrent: () => Network.getNetworkStateAsync(),
  subscribe: (listener) => Network.addNetworkStateListener(listener)
};
