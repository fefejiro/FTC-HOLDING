import { useState, useEffect, useCallback, useRef } from "react";
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
  source: "gps" | "manual" | "cached" | "ai-enhanced";
  accuracy?: number;
  timestamp: number;
}

interface UseLocationOptions {
  autoDetect?: boolean;
  cacheKey?: string;
  gpsTimeout?: number;
  useAiEnhancement?: boolean;
}

interface UseLocationReturn {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  detectLocation: () => Promise<LocationData | null>;
  setManualLocation: (query: string) => Promise<LocationData | null>;
  clearLocation: () => void;
  refreshLocation: () => Promise<LocationData | null>;
}

const CACHE_KEY = "peacepad_location_v2";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for confirmed locations

/**
 * Unified location hook for PeacePad
 * Uses a consent-respecting detection system:
 * 1. GPS (with 5s timeout)
 * 2. Optional server refinement (disabled by default in this release)
 * 3. Confirmed cached location fallback
 */
export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    autoDetect = false,
    cacheKey = CACHE_KEY,
    gpsTimeout = 5000,
    useAiEnhancement = false,
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoDetected = useRef(false);

  // Load cached location on mount
  useEffect(() => {
    const cached = loadCachedLocation(cacheKey);
    if (cached) {
      setLocation(cached);
    }
  }, [cacheKey]);

  // Auto-detect on mount if enabled
  useEffect(() => {
    if (autoDetect && !hasAutoDetected.current && !location) {
      hasAutoDetected.current = true;
      detectLocation();
    }
  }, [autoDetect]);

  const loadCachedLocation = (key: string): LocationData | null => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached) as LocationData;
        // Check if cache is still valid
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          return { ...data, source: "cached" };
        }
      }
    } catch (e) {
      console.error("[useLocation] Failed to load cached location:", e);
    }
    return null;
  };

  const saveLocation = useCallback((data: LocationData) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (e) {
      console.error("[useLocation] Failed to cache location:", e);
    }
  }, [cacheKey]);

  // Tier 1: GPS-based location
  const getGPSLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      console.log("[useLocation] GPS not available");
      return null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.log("[useLocation] GPS timeout after", gpsTimeout, "ms");
        resolve(null);
      }, gpsTimeout);

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
                countryCode: data.countryCode,
                postalCode: data.postalCode,
                source: "gps",
                accuracy,
                timestamp: Date.now(),
              };
              console.log("[useLocation] GPS location acquired");
              resolve(locationData);
              return;
            }
          } catch (e) {
            console.error("[useLocation] Reverse geocoding failed:", e);
          }

          // Return basic GPS coords if reverse geocoding fails
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
          console.log("[useLocation] GPS error:", gpsError.message);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: gpsTimeout, maximumAge: 60000 }
      );
    });
  }, [gpsTimeout]);

  // Optional server-side refinement. The release server currently returns the
  // supplied location unchanged and never sends it to a third-party AI service.
  const enhanceWithAI = useCallback(async (baseLocation: LocationData): Promise<LocationData> => {
    if (!useAiEnhancement) return baseLocation;

    try {
      console.log("[useLocation] Enhancing location with AI...");
      const res = await apiRequest("POST", "/api/location/ai-enhance", {
        location: baseLocation,
      });
      
      if (res.ok) {
        const enhanced = await res.json();
        if (enhanced.displayName) {
          return {
            ...baseLocation,
            ...enhanced,
            source: "ai-enhanced",
            timestamp: Date.now(),
          };
        }
      }
    } catch (e) {
      console.log("[useLocation] AI enhancement skipped:", e);
    }
    return baseLocation;
  }, [useAiEnhancement]);

  // Main detection function: GPS, then a previously confirmed cached value.
  const detectLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      let result = await getGPSLocation();

      // Optional refinement is off by default for this release.
      if (result && useAiEnhancement) {
        result = await enhanceWithAI(result);
      }

      // Use a previously confirmed cached location as the fallback.
      if (!result) {
        result = loadCachedLocation(cacheKey);
        if (result) {
          console.log("[useLocation] Using cached location");
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
      console.error("[useLocation] Detection failed:", e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getGPSLocation, enhanceWithAI, saveLocation, cacheKey, useAiEnhancement]);

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
            countryCode: first.countryCode,
            postalCode: first.postalCode,
            source: "manual",
            timestamp: Date.now(),
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

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      console.error("[useLocation] Failed to clear cache:", e);
    }
  }, [cacheKey]);

  const refreshLocation = useCallback(async (): Promise<LocationData | null> => {
    // Clear cache and re-detect
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      // ignore
    }
    return detectLocation();
  }, [detectLocation, cacheKey]);

  return {
    location,
    isLoading,
    error,
    detectLocation,
    setManualLocation,
    clearLocation,
    refreshLocation,
  };
}
