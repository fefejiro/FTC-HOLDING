import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  source: "gps" | "ip" | "manual" | "cached" | "ai-enhanced";
  accuracy?: number;
  timestamp: number;
  isCanada?: boolean;
}

interface LocationContextType {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  detectLocation: () => Promise<LocationData | null>;
  setManualLocation: (query: string) => Promise<LocationData | null>;
  selectLocation: (location: LocationData) => void;
  clearLocation: () => void;
  refreshLocation: () => Promise<LocationData | null>;
}

const LocationContext = createContext<LocationContextType | null>(null);

const CACHE_KEY = "peacepad_location_v2";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for confirmed locations
const GPS_TIMEOUT = 5000; // 5 seconds

interface LocationProviderProps {
  children: React.ReactNode;
  useAiEnhancement?: boolean;
}

export function LocationProvider({ children, useAiEnhancement = true }: LocationProviderProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Load cached location on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const cached = loadCachedLocation();
    if (cached) {
      setLocation(cached);
      console.log("[LocationProvider] Loaded cached location:", cached.displayName);
    }
  }, []);

  const loadCachedLocation = (): LocationData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as LocationData;
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          return { ...data, source: "cached" };
        }
      }
    } catch (e) {
      console.error("[LocationProvider] Failed to load cached location:", e);
    }
    return null;
  };

  const saveLocation = useCallback((data: LocationData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("[LocationProvider] Failed to cache location:", e);
    }
  }, []);

  // Tier 1: GPS-based location
  const getGPSLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      console.log("[LocationProvider] GPS not available");
      return null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.log("[LocationProvider] GPS timeout after 5s");
        resolve(null);
      }, GPS_TIMEOUT);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          const { latitude, longitude, accuracy } = position.coords;

          try {
            const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`, {
              credentials: "include",
            });
            if (res.ok) {
              const data = await res.json();
              const locationData: LocationData = {
                displayName: data.displayName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                address: data.address || data.displayName || "",
                lat: latitude,
                lng: longitude,
                city: data.city,
                state: data.state,
                country: data.country,
                countryCode: data.countryCode?.toUpperCase(),
                postalCode: data.postalCode,
                source: "gps",
                accuracy,
                timestamp: Date.now(),
                isCanada: data.country === "Canada" || data.countryCode?.toUpperCase() === "CA",
              };
              console.log("[LocationProvider] GPS success:", locationData.displayName);
              resolve(locationData);
              return;
            }
          } catch (e) {
            console.error("[LocationProvider] Reverse geocoding failed:", e);
          }

          resolve({
            displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            address: "",
            lat: latitude,
            lng: longitude,
            source: "gps",
            accuracy,
            timestamp: Date.now(),
          });
        },
        (gpsError) => {
          clearTimeout(timeoutId);
          console.log("[LocationProvider] GPS error:", gpsError.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: GPS_TIMEOUT, maximumAge: 30000 }
      );
    });
  }, []);

  // Tier 2: IP-based geolocation
  const getIPLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      console.log("[LocationProvider] Trying IP-based geolocation...");
      const res = await fetch("/api/geocode/ip", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          const locationData: LocationData = {
            displayName: data.displayName || `${data.city || ""}, ${data.country || ""}`,
            address: data.displayName || "",
            lat: data.lat,
            lng: data.lng,
            city: data.city,
            state: data.state,
            country: data.country,
            countryCode: data.countryCode?.toUpperCase(),
            source: "ip",
            timestamp: Date.now(),
            isCanada: data.country === "Canada" || data.countryCode?.toUpperCase() === "CA",
          };
          console.log("[LocationProvider] IP geolocation success:", locationData.displayName);
          return locationData;
        }
      }
    } catch (e) {
      console.error("[LocationProvider] IP geolocation failed:", e);
    }
    return null;
  }, []);

  // Tier 3: AI-enhanced location refinement
  const enhanceWithAI = useCallback(async (baseLocation: LocationData): Promise<LocationData> => {
    if (!useAiEnhancement) return baseLocation;

    try {
      console.log("[LocationProvider] Enhancing location with AI...");
      const res = await apiRequest("POST", "/api/location/ai-enhance", {
        location: baseLocation,
      });

      if (res.ok) {
        const enhanced = await res.json();
        if (enhanced.displayName) {
          const result: LocationData = {
            ...baseLocation,
            displayName: enhanced.displayName || baseLocation.displayName,
            city: enhanced.city || baseLocation.city,
            state: enhanced.state || baseLocation.state,
            country: enhanced.country || baseLocation.country,
            countryCode: enhanced.countryCode?.toUpperCase() || baseLocation.countryCode,
            source: "ai-enhanced",
            timestamp: Date.now(),
            isCanada: enhanced.country === "Canada" || enhanced.countryCode?.toUpperCase() === "CA",
          };
          console.log("[LocationProvider] AI enhanced:", result.displayName);
          return result;
        }
      }
    } catch (e) {
      console.log("[LocationProvider] AI enhancement skipped:", e);
    }
    return baseLocation;
  }, [useAiEnhancement]);

  // Main detection function with 4-tier fallback
  const detectLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Tier 1: Try GPS first
      let result = await getGPSLocation();

      // Tier 2: Fall back to IP if GPS fails
      if (!result) {
        result = await getIPLocation();
      }

      // Tier 3: Try AI enhancement if we have a result
      if (result && useAiEnhancement) {
        result = await enhanceWithAI(result);
      }

      // Tier 4: Use cached location as last resort
      if (!result) {
        result = loadCachedLocation();
        if (result) {
          console.log("[LocationProvider] Using cached location");
        }
      }

      if (result) {
        setLocation(result);
        saveLocation(result);
        return result;
      } else {
        setError("Could not determine your location. Please enter it manually.");
        return null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Location detection failed";
      setError(msg);
      console.error("[LocationProvider] Detection failed:", e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getGPSLocation, getIPLocation, enhanceWithAI, saveLocation, useAiEnhancement]);

  // Manual location search
  const setManualLocation = useCallback(async (query: string): Promise<LocationData | null> => {
    if (!query || query.length < 2) return null;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          const locationData: LocationData = {
            displayName: first.displayName,
            address: first.address || first.displayName,
            lat: first.lat,
            lng: first.lng,
            city: first.city,
            state: first.state,
            country: first.country,
            countryCode: first.countryCode?.toUpperCase(),
            postalCode: first.postalCode,
            source: "manual",
            timestamp: Date.now(),
            isCanada: first.country === "Canada" || first.countryCode?.toUpperCase() === "CA",
          };

          // Enhance with AI if enabled
          const enhanced = useAiEnhancement ? await enhanceWithAI(locationData) : locationData;

          setLocation(enhanced);
          saveLocation(enhanced);
          return enhanced;
        }
      }

      setError("Location not found. Please try a different search.");
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to search location";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enhanceWithAI, saveLocation, useAiEnhancement]);

  // Direct location selection (from autocomplete results)
  const selectLocation = useCallback((loc: LocationData) => {
    const enhanced = {
      ...loc,
      timestamp: Date.now(),
      isCanada: loc.country === "Canada" || loc.countryCode?.toUpperCase() === "CA",
    };
    setLocation(enhanced);
    saveLocation(enhanced);
    setError(null);
  }, [saveLocation]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      console.error("[LocationProvider] Failed to clear cache:", e);
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      // ignore
    }
    return detectLocation();
  }, [detectLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        detectLocation,
        setManualLocation,
        selectLocation,
        clearLocation,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationContext must be used within a LocationProvider");
  }
  return context;
}

// Optional hook for components that can work without the provider
export function useOptionalLocationContext() {
  return useContext(LocationContext);
}
