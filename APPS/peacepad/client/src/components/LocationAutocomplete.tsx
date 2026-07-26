import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LocationResult {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  value?: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter an address or place...",
  className,
  disabled = false
}: LocationAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value?.displayName || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsFailedMessage, setGpsFailedMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('peacepad_last_location');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        if (location.lat && location.lng) {
          setUserLocation({ lat: location.lat, lng: location.lng });
        }
      } catch (error) {
        console.error('Failed to parse saved location:', error);
      }
    }
  }, []);

  // Debounce search query with very fast response (50ms for instant feel)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 50); // Reduced from 100ms for snappier autocomplete

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch geocoding results with location bias
  const { data, isLoading } = useQuery<{ results: LocationResult[] }>({
    queryKey: ['/api/geocode', debouncedQuery, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      let url = `/api/geocode?query=${encodeURIComponent(debouncedQuery)}`;
      // Add location bias if we have user's location
      if (userLocation) {
        url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
      }
      const res = await fetch(url, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch geocoding results');
      }
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Get user's current location using GPS only (no inaccurate IP fallback)
  const handleUseMyLocation = async () => {
    setIsGettingLocation(true);
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.log('[Location] Geolocation not available');
      setSearchQuery('');
      setIsGettingLocation(false);
      setShowSuggestions(true); // Keep dropdown open so user can type
      return;
    }
    
    // Create a promise with longer timeout for GPS (15 seconds for better accuracy)
    const getGPSLocation = new Promise<GeolocationPosition>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('GPS timeout'));
      }, 15000); // 15 second timeout for better GPS lock
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 } // High accuracy, allow 1 min cache
      );
    });
    
    try {
      const position = await getGPSLocation;
      const { latitude, longitude, accuracy } = position.coords;
      console.log("[Location] GPS coordinates acquired");
      setUserLocation({ lat: latitude, lng: longitude });
      
      // Reverse geocode to get address
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.displayName) {
            const locationData: LocationData = {
              displayName: data.displayName,
              address: data.address || data.displayName,
              lat: latitude,
              lng: longitude,
            };
            setSearchQuery(data.displayName);
            onChange(locationData);
            
            // Save for future use
            localStorage.setItem('peacepad_last_location', JSON.stringify({
              lat: latitude,
              lng: longitude,
              address: data.displayName,
            }));
            console.log("[Location] GPS location resolved");
          }
        }
      } catch (error) {
        console.error('[Location] Reverse geocoding failed:', error);
        // Still use coordinates even if reverse geocoding fails
        const coordDisplay = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setSearchQuery(coordDisplay);
        onChange({ displayName: coordDisplay, address: coordDisplay, lat: latitude, lng: longitude });
      }
      
      setIsGettingLocation(false);
      setShowSuggestions(false);
    } catch (gpsError) {
      console.log('[Location] GPS failed:', gpsError);
      // Clear and let user type manually with helpful message
      setSearchQuery('');
      setIsGettingLocation(false);
      setGpsFailedMessage('Location not available. Please type your address below.');
      setShowSuggestions(true); // Keep dropdown open so user can type
      
      // Focus the input so user can start typing immediately
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      console.log('[Location] Please type your location manually');
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowSuggestions(true);
    setGpsFailedMessage(null); // Clear GPS failed message when user starts typing
    
    // If user clears the input, clear the selection
    if (!newValue) {
      onChange(null);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    onChange(null);
    setShowSuggestions(false);
    // Focus back on input for immediate new search
    inputRef.current?.focus();
  };

  const handleSelectLocation = (location: LocationResult) => {
    const locationData: LocationData = {
      displayName: location.displayName,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    };
    
    setSearchQuery(location.displayName);
    onChange(locationData);
    setShowSuggestions(false);
  };

  const suggestions = data?.results || [];
  const showDropdown = showSuggestions && (
    debouncedQuery.length >= 2 && (isLoading || suggestions.length > 0) || 
    (!searchQuery && !value) || 
    gpsFailedMessage // Show dropdown when GPS failed so user sees the message
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn("pl-9 pr-24", className)}
          disabled={disabled || isGettingLocation}
          data-testid="input-location-search"
        />
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {!searchQuery && !isGettingLocation && navigator.geolocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUseMyLocation}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-use-my-location"
              title="Use my current location"
            >
              <Navigation className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Nearby</span>
            </Button>
          )}
          {isGettingLocation && (
            <Loader2 className="h-4 w-4 text-primary animate-spin mr-2" />
          )}
          {searchQuery && !isLoading && !isGettingLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 hover:bg-muted"
              data-testid="button-clear-location"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear location</span>
            </Button>
          )}
          {isLoading && !isGettingLocation && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin mr-2" />
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* GPS failed message - prompts user to type manually */}
          {gpsFailedMessage && !searchQuery && (
            <div className="p-3 border-b bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <MapPin className="h-4 w-4 shrink-0" />
                <div className="text-sm">{gpsFailedMessage}</div>
              </div>
            </div>
          )}
          
          {/* Use my location option when input is empty and GPS hasn't failed */}
          {!searchQuery && !value && navigator.geolocation && !gpsFailedMessage && (
            <button
              onClick={handleUseMyLocation}
              disabled={isGettingLocation}
              className="w-full text-left p-3 hover-elevate active-elevate-2 border-b focus:outline-none"
              data-testid="button-dropdown-use-location"
            >
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-primary">
                    {isGettingLocation ? "Getting your location..." : "Use my current location"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Auto-detect your address
                  </div>
                </div>
                {isGettingLocation && (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
              </div>
            </button>
          )}
          
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Searching locations...
            </div>
          )}
          
          {!isLoading && suggestions.length === 0 && debouncedQuery.length >= 2 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No locations found for "{searchQuery}"
            </div>
          )}

          {!isLoading && suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => handleSelectLocation(location)}
              className="w-full text-left p-3 hover-elevate active-elevate-2 border-b last:border-b-0 focus:outline-none"
              data-testid={`location-suggestion-${index}`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {location.displayName}
                  </div>
                  {location.city && (
                    <div className="text-xs text-muted-foreground">
                      {[location.city, location.state, location.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
