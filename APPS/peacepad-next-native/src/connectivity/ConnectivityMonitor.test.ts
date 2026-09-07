import { usableConnectivity } from "./ConnectivityMonitor";

describe("usableConnectivity", () => {
  it("treats an explicit network or internet failure as offline", () => {
    expect(usableConnectivity({ isConnected: false, isInternetReachable: true })).toBe(false);
    expect(usableConnectivity({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it("allows a connected network unless internet reachability is explicitly false", () => {
    expect(usableConnectivity({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(usableConnectivity({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it("leaves an indeterminate network state unknown", () => {
    expect(usableConnectivity({ isConnected: null, isInternetReachable: null })).toBeUndefined();
    expect(usableConnectivity({})).toBeUndefined();
  });
});
