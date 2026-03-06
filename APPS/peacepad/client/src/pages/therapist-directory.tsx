import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Globe, Star, AlertCircle, Heart, Users, Scale, Loader2, Shield, CheckCircle2, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { ResourceSchema } from "@/components/ResourceSchema";
import { useShakeDetection } from "@/hooks/useShakeDetection";

interface LocationSuggestion {
  lat: number;
  lng: number;
  displayName: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
}

const COUNTRY_CODE_MAP: Record<string, string> = {
  'canada': 'CA', 'united states': 'US', 'usa': 'US', 'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
  'australia': 'AU', 'new zealand': 'NZ', 'ireland': 'IE', 'germany': 'DE', 'france': 'FR', 'spain': 'ES',
  'india': 'IN', 'south africa': 'ZA', 'brazil': 'BR', 'mexico': 'MX', 'japan': 'JP', 'netherlands': 'NL', 'sweden': 'SE',
  'united arab emirates': 'AE', 'uae': 'AE', 'china': 'CN', 'singapore': 'SG', 'malaysia': 'MY', 'philippines': 'PH',
  'indonesia': 'ID', 'thailand': 'TH', 'south korea': 'KR', 'italy': 'IT', 'portugal': 'PT', 'poland': 'PL',
  'nigeria': 'NG', 'kenya': 'KE', 'egypt': 'EG', 'saudi arabia': 'SA', 'qatar': 'QA', 'pakistan': 'PK',
  'bangladesh': 'BD', 'sri lanka': 'LK', 'colombia': 'CO', 'argentina': 'AR', 'chile': 'CL', 'peru': 'PE',
};

const getCountryCode = (countryName: string): string => {
  const normalized = countryName.toLowerCase().trim();
  return COUNTRY_CODE_MAP[normalized] || 'INT';
};

export default function TherapistDirectoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, address?: string, isCanada?: boolean, countryCode?: string, source?: 'gps' | 'ip' | 'manual'} | null>(null);
  const [searchDistance, setSearchDistance] = useState<number>(5);
  const [postalCode, setPostalCode] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [resourceType, setResourceType] = useState<string>("all");
  const [genderFocus, setGenderFocus] = useState<string>("all");
  const [hasCheckedSavedLocation, setHasCheckedSavedLocation] = useState<boolean>(false);
  const [hasAttemptedAutoLocation, setHasAttemptedAutoLocation] = useState<boolean>(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('peacepad_privacy_mode');
    return saved === 'true';
  });
  const [isContentVisible, setIsContentVisible] = useState<boolean>(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Shake-to-toggle content visibility within privacy mode
  const { permissionState, requestPermission } = useShakeDetection({
    threshold: 15,
    enabled: isPrivacyMode,
    onShake: () => {
      if (isPrivacyMode) {
        setIsContentVisible(prev => !prev);
        toast({
          title: isContentVisible ? "Content hidden" : "Content visible",
          description: isContentVisible ? "Shake again to restore" : "Content restored",
          duration: 2000,
        });
      }
    }
  });

  // Toggle Privacy Mode - controls all privacy features
  const handlePrivacyModeToggle = async () => {
    const newMode = !isPrivacyMode;
    
    // If enabling privacy mode and shake permission not granted, request it
    if (newMode && permissionState === 'pending') {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Motion permission denied",
          description: "Privacy Mode enabled without shake detection",
          variant: "default",
          duration: 3000,
        });
      }
    }
    
    // Update privacy mode
    setIsPrivacyMode(newMode);
    localStorage.setItem('peacepad_privacy_mode', String(newMode));
    
    if (newMode) {
      setIsContentVisible(false);
      localStorage.removeItem('peacepad_last_location');
      setUserLocation(null);
      toast({
        title: "Privacy Mode enabled",
        description: "Content hidden • Anonymous browsing • Shake to toggle",
        duration: 4000,
      });
    } else {
      setIsContentVisible(true);
      toast({
        title: "Privacy Mode disabled",
        description: "Normal browsing restored",
        duration: 3000,
      });
    }
  };

  // Load saved location from localStorage on mount (skip if privacy mode)
  useEffect(() => {
    if (!isPrivacyMode) {
      const savedLocation = localStorage.getItem('peacepad_last_location');
      if (savedLocation) {
        try {
          const location = JSON.parse(savedLocation);
          setUserLocation(location);
          setHasAttemptedAutoLocation(true);
        } catch (error) {
          console.error('Failed to parse saved location:', error);
        }
      }
    }
    setHasCheckedSavedLocation(true);
  }, [isPrivacyMode]);

  // Auto-detect location on page load (only once, after checking localStorage, skip if privacy mode)
  useEffect(() => {
    if (hasCheckedSavedLocation && !hasAttemptedAutoLocation && !userLocation && navigator.geolocation && !isPrivacyMode) {
      setHasAttemptedAutoLocation(true);
      handleUseMyLocation();
    }
  }, [hasCheckedSavedLocation, hasAttemptedAutoLocation, userLocation, isPrivacyMode]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch location suggestions as user types (debounced)
  const handleLocationInputChange = (value: string) => {
    setPostalCode(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsFetchingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Canadian postal codes: A1A 1A1 or A1A format
        const isPostalCode = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(trimmedValue) || /^[A-Za-z]\d[A-Za-z]$/.test(trimmedValue);
        // Send as-is - server handles Canada prioritization automatically
        const searchString = isPostalCode ? trimmedValue.toUpperCase() : trimmedValue;

        const response = await fetch(`/api/geocode?query=${encodeURIComponent(searchString)}`, {
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          setLocationSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 50); // Reduced from 400ms for snappier autocomplete
  };

  // Select a location from autocomplete suggestions
  const selectLocation = (suggestion: LocationSuggestion) => {
    const isCanada = suggestion.country === 'Canada' || suggestion.country?.toLowerCase().includes('canada');
    const countryCode = getCountryCode(suggestion.country || '');
    
    const friendlyAddress = suggestion.city 
      ? `${suggestion.city}${suggestion.state ? ', ' + suggestion.state : ''}${suggestion.country ? ', ' + suggestion.country : ''}`
      : suggestion.address;
    
    const location = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: friendlyAddress,
      isCanada,
      countryCode,
      source: 'manual' as const,
    };

    setUserLocation(location);
    if (!isPrivacyMode) {
      localStorage.setItem('peacepad_last_location', JSON.stringify(location));
    }
    setPostalCode(friendlyAddress);
    setShowSuggestions(false);
    setLocationSuggestions([]);

    toast({
      title: "Location selected",
      description: `Searching near ${friendlyAddress}`,
      duration: 2000,
    });
  };

  const handleUseMyLocation = async () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      
      // Explicitly check for permission state first to give better feedback
      if ('permissions' in navigator) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
            setIsGettingLocation(false);
            toast({
              title: "Location access denied",
              description: "Please check your browser settings to allow location access or enter manually.",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }
        } catch (e) {
          console.warn('Permissions API not supported for geolocation');
        }
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          console.log(`[Location] Found coordinates: ${lat}, ${lng}`);
          
          try {
            const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
              credentials: 'include',
            });
            
            let location;
            if (response.ok) {
              const data = await response.json();
              console.log(`[Location] Reverse geocoding result:`, data);
              const countryCode = data.countryCode?.toUpperCase() || getCountryCode(data.country || '');
              location = {
                lat,
                lng,
                address: data.displayName || 'Your current location',
                isCanada: data.country === 'Canada' || data.countryCode === 'CA',
                countryCode,
                source: 'gps' as const,
              };
            } else {
              console.warn(`[Location] API reverse geocoding failed, falling back to Nominatim direct`);
              const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
              const nsResponse = await fetch(reverseUrl, {
                headers: { 'User-Agent': 'PeacePad/1.0 (peacepad@peacepad.ca)' }
              });
              const data = await nsResponse.json();
              
              const isCanada = data.address?.country_code === 'ca';
              const countryCode = data.address?.country_code?.toUpperCase() || getCountryCode(data.address?.country || '');
              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
              const state = data.address?.state || data.address?.province;
              const country = data.address?.country;
              
              const friendlyAddress = city
                ? `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`
                : 'Your current location';
              
              location = {
                lat,
                lng,
                address: friendlyAddress,
                isCanada,
                countryCode,
                source: 'gps' as const,
              };
            }
            
            setUserLocation(location);
            if (!isPrivacyMode) {
              localStorage.setItem('peacepad_last_location', JSON.stringify(location));
            }
            setPostalCode(location.address);
            
            setIsGettingLocation(false);
            toast({
              title: "Location found",
              description: `Using ${location.address}`,
              duration: 2000,
            });
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            const location = {
              lat,
              lng,
              address: 'Your current location',
              isCanada: false,
              source: 'gps' as const,
            };
            
            setUserLocation(location);
            if (!isPrivacyMode) {
              localStorage.setItem('peacepad_last_location', JSON.stringify(location));
            }
            setIsGettingLocation(false);
          }
        },
        async (error) => {
          console.error('[Location] GPS error:', error.code, error.message);
          
          // Try IP-based fallback, but mark as approximate
          try {
            const ipResponse = await fetch('/api/geocode/ip', { credentials: 'include' });
            if (ipResponse.ok) {
              const ipData = await ipResponse.json();
              if (ipData.lat && ipData.lng) {
                const countryCode = ipData.countryCode?.toUpperCase() || 'INT';
                const location = {
                  lat: ipData.lat,
                  lng: ipData.lng,
                  address: ipData.displayName || `${ipData.city || ''}, ${ipData.country || ''}`,
                  isCanada: ipData.countryCode?.toUpperCase() === 'CA',
                  countryCode,
                  source: 'ip' as const,
                };
                setUserLocation(location);
                if (!isPrivacyMode) {
                  localStorage.setItem('peacepad_last_location', JSON.stringify(location));
                }
                setPostalCode(location.address);
                setIsGettingLocation(false);
                toast({
                  title: "Approximate location found",
                  description: "Based on your network. Enter your city or postal code for more accurate results.",
                  duration: 5000,
                });
                return;
              }
            }
          } catch (ipError) {
            console.error('[Location] IP fallback also failed:', ipError);
          }
          
          setIsGettingLocation(false);
          
          let errorMessage = "Please enter your location manually instead.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location access was denied. Please check your browser settings or enter manually.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Location information is unavailable. Please try searching for your city.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Location request timed out. Please try again or enter manually.";
          }
          
          toast({
            title: "Location unavailable",
            description: errorMessage,
            variant: "destructive",
            duration: 5000,
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 } // 15s timeout for better GPS lock
      );
    } else {
      toast({
        title: "Not supported",
        description: "Your browser does not support location services",
        variant: "default",
        duration: 3000,
      });
    }
  };

  // Fetch crisis resources (available nationwide, use large radius to capture all)
  const { data: crisisResources = [], isLoading: crisisLoading } = useQuery({
    queryKey: ["/api/support-resources", "crisis", resourceType, genderFocus, userLocation?.countryCode],
    enabled: !!user && (resourceType === "all" || resourceType === "crisis"),
    queryFn: async () => {
      // Use user's location if available, otherwise use Canada center (Toronto as proxy)
      const lat = userLocation?.lat || 56.1304; // Canada geographic center
      const lng = userLocation?.lng || -106.3468;
      const countryCode = userLocation?.countryCode || 'CA';
      
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        maxDistance: "50000", // Large radius to capture all nationwide crisis resources
        resourceType: "crisis",
        genderFocus: genderFocus,
        userCountryCode: countryCode,
      });
      
      const response = await fetch(`/api/support-resources?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch crisis resources');
      return response.json();
    },
  });

  // Fetch location-based resources when user searches
  const { data: localResources = [], isLoading: localLoading } = useQuery({
    queryKey: ["/api/support-resources", userLocation?.lat, userLocation?.lng, searchDistance, userLocation?.address, userLocation?.countryCode, resourceType, genderFocus],
    enabled: !!user && !!userLocation && resourceType !== "crisis",
    queryFn: async () => {
      const distanceInKm = userLocation!.isCanada 
        ? searchDistance 
        : Math.round(searchDistance * 1.60934);
      
      const params = new URLSearchParams({
        lat: userLocation!.lat.toString(),
        lng: userLocation!.lng.toString(),
        maxDistance: distanceInKm.toString(),
        address: userLocation!.address || '',
        resourceType: resourceType,
        genderFocus: genderFocus,
        userCountryCode: userLocation!.countryCode || 'CA',
      });
      
      const response = await fetch(`/api/support-resources?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
  });

  // Haversine distance calculator
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Combine resources and deduplicate by ID
  let resources: any[] = [];
  if (resourceType === "crisis") {
    resources = crisisResources;
  } else {
    // Combine crisis + local, deduplicate by ID
    const seen = new Set();
    const combined = [...crisisResources, ...localResources];
    resources = combined.filter(resource => {
      if (seen.has(resource.id)) return false;
      seen.add(resource.id);
      return true;
    });
  }

  // Smart geo-fencing: Detect user's country and prioritize matching resources
  const userCountry = userLocation?.countryCode || 'INT';
  
  // Calculate distance and proximity tier for each resource
  resources = resources.map(resource => {
    const isUserCountry = resource.countryCode === userCountry;
    const isInternational = resource.countryCode === 'INT';
    
    if (userLocation && resource.latitude && resource.longitude) {
      const lat = parseFloat(resource.latitude);
      const lon = parseFloat(resource.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const distKm = calculateDistance(userLocation.lat, userLocation.lng, lat, lon);
        const displayDist = userLocation.isCanada 
          ? Math.round(distKm * 10) / 10
          : Math.round((distKm / 1.60934) * 10) / 10;
        
        let proximityTier: 'local' | 'nearby' | 'regional' | 'nationwide' | 'international';
        if (distKm < 10) proximityTier = 'local';
        else if (distKm <= 50) proximityTier = 'nearby';
        else proximityTier = 'regional';
        
        return {
          ...resource,
          calculatedDistance: displayDist,
          distanceKm: distKm,
          proximityTier,
          isUserCountry,
          isInternational,
        };
      }
    }
    
    // Nationwide or online services
    return {
      ...resource,
      proximityTier: resource.isNationwide ? 'nationwide' : (isInternational ? 'international' : 'regional'),
      distanceKm: resource.isNationwide ? 0 : Infinity,
      isUserCountry,
      isInternational,
    };
  });

  // Smart sorting: User's country first, then international resources
  resources.sort((a, b) => {
    // Priority 1: User's country resources first
    if (a.isUserCountry && !b.isUserCountry) return -1;
    if (!a.isUserCountry && b.isUserCountry) return 1;
    
    // Priority 2: Crisis resources within each group
    const aCrisis = a.category === 'crisis' ? 1 : 0;
    const bCrisis = b.category === 'crisis' ? 1 : 0;
    if (aCrisis !== bCrisis) return bCrisis - aCrisis;
    
    // Priority 3: Nationwide services first (for phone-based crisis lines)
    const aNationwide = a.isNationwide ? 1 : 0;
    const bNationwide = b.isNationwide ? 1 : 0;
    if (aNationwide !== bNationwide) return bNationwide - aNationwide;
    
    // Priority 4: Local services by distance
    const tierOrder = { local: 0, nearby: 1, regional: 2, nationwide: 3, international: 4 };
    const tierA = tierOrder[a.proximityTier as keyof typeof tierOrder] ?? 5;
    const tierB = tierOrder[b.proximityTier as keyof typeof tierOrder] ?? 5;
    if (tierA !== tierB) return tierA - tierB;
    
    // Priority 5: Distance within same tier
    const distA = a.distanceKm ?? Infinity;
    const distB = b.distanceKm ?? Infinity;
    return distA - distB;
  });
  
  const isLoading = crisisLoading || localLoading;

  const openInMaps = (address: string, lat: string, lng: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`https://maps.apple.com/?q=${encodeURIComponent(address)}&ll=${lat},${lng}`);
    } else if (isAndroid) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    }
  };

  return (
    <>
      <SEOHead
        title="Find Therapists & Family Support Near You | Free Directory | PeacePad"
        description="Search licensed family therapists, co-parenting counselors, mediators, and crisis support by location. Find free and low-cost resources in Canada. Filter by specialty, cost, and distance."
        keywords="family therapist near me, co-parenting counselor Canada, family mediator near me, divorce counselor, child therapist, crisis support hotline Canada, domestic violence resources, legal aid family law, free therapy resources, low-cost counseling, sliding scale therapy"
        canonical="https://peacepad.ca/therapist-directory"
      />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-find-support-title">Find Support</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Crisis support, therapists, family services & resources near you
            </p>
          </div>
          <Button
            variant={isPrivacyMode ? "default" : "outline"}
            size="icon"
            onClick={handlePrivacyModeToggle}
            data-testid="button-privacy-mode"
            title={isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
          >
            <Shield className="h-4 w-4" />
          </Button>
        </div>

        {isPrivacyMode && !isContentVisible ? (
          <Card className="p-8 sm:p-12 text-center">
            <CardContent>
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Content Hidden</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Privacy Mode active. Shake device or click below to show content.
              </p>
              <Button onClick={() => setIsContentVisible(true)} data-testid="button-show-content" size="sm">
                Show Content
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Simplified Sticky Filter Panel */}
        <div className="sticky top-0 z-10 bg-background border-b pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-0">
          <div className="space-y-3">
            {/* Location Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative" ref={suggestionsRef}>
                <div className="relative">
                  <Label htmlFor="support-location-input" className="sr-only">
                    Search by city or postal code
                  </Label>
                  <Input
                    id="support-location-input"
                    name="locationSearch"
                    type="text"
                    placeholder="City, postal code..."
                    value={postalCode}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    onFocus={() => {
                      if (locationSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    autoComplete="postal-code"
                    aria-label="Search by city or postal code"
                    className="text-sm"
                    data-testid="input-postal-code"
                  />
                  {isFetchingSuggestions && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    <div className="p-1 space-y-0.5">
                      {locationSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectLocation(suggestion)}
                          className="w-full text-left px-2 py-2 rounded text-sm hover:bg-accent"
                          data-testid={`suggestion-${index}`}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 text-xs">
                              <span className="font-medium truncate block">{suggestion.city || suggestion.address}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleUseMyLocation}
                variant="outline"
                disabled={isGettingLocation}
                size="sm"
                className="flex-shrink-0 text-xs sm:text-sm"
                data-testid="button-use-location"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">My Location</span>
              </Button>
            </div>

            {/* Quick Filters Row */}
            <div className="flex gap-2 flex-wrap">
              {/* Type Filter */}
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger
                  className="w-auto text-xs sm:text-sm h-9"
                  data-testid="select-resource-type"
                  aria-label="Filter by service type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="crisis">Crisis Support</SelectItem>
                  <SelectItem value="therapist">Therapists</SelectItem>
                  <SelectItem value="family-services">Family Services</SelectItem>
                  <SelectItem value="legal">Legal Services</SelectItem>
                </SelectContent>
              </Select>

              {/* Gender Focus Filter */}
              <Select value={genderFocus} onValueChange={setGenderFocus}>
                <SelectTrigger
                  className="w-auto text-xs sm:text-sm h-9"
                  data-testid="select-gender-focus"
                  aria-label="Filter by gender focus"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male Survivors</SelectItem>
                  <SelectItem value="female">Female Survivors</SelectItem>
                  <SelectItem value="lgbtq+">LGBTQ+</SelectItem>
                </SelectContent>
              </Select>

              {/* Distance Filter - Only shown when location selected */}
              {userLocation && (
                <Select value={searchDistance.toString()} onValueChange={(v) => setSearchDistance(parseInt(v))}>
                  <SelectTrigger
                    className="w-auto text-xs sm:text-sm h-9"
                    data-testid="select-search-radius"
                    aria-label="Filter by search radius"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 {userLocation.isCanada ? 'km' : 'mi'}</SelectItem>
                    <SelectItem value="10">10 {userLocation.isCanada ? 'km' : 'mi'}</SelectItem>
                    <SelectItem value="25">25 {userLocation.isCanada ? 'km' : 'mi'}</SelectItem>
                    <SelectItem value="50">50 {userLocation.isCanada ? 'km' : 'mi'}</SelectItem>
                    <SelectItem value="100">100 {userLocation.isCanada ? 'km' : 'mi'}</SelectItem>
                    <SelectItem value="200">200 {userLocation.isCanada ? 'km' : 'mi'}</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Results Count Badge */}
              {resources.length > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-results-count">
                  {resources.length} results
                </Badge>
              )}
            </div>

            {userLocation && (
              <div className={`flex items-center justify-between gap-2 text-xs text-muted-foreground p-2 rounded-md border mb-2 ${
                userLocation.source === 'ip' 
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40' 
                  : 'bg-muted/30 border-muted/50'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="truncate">
                    Searching near: <strong>{userLocation.address}</strong>
                  </span>
                </div>
                {userLocation.source === 'ip' && (
                  <span className="text-amber-600 dark:text-amber-400 flex-shrink-0 text-[10px] flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Estimated — type your city for better results
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-3 mt-4">
          {!userLocation && resources.length > 0 && (
            <Card className="bg-muted/30 border-0">
              <CardContent className="pt-4 pb-4 text-center text-sm text-muted-foreground">
                Showing 24/7 crisis support available nationwide. Enter a location to find local services.
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : resources.length === 0 && userLocation ? (
            <Card className="bg-muted/30 border-0">
              <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
                No resources found within {searchDistance} {userLocation.isCanada ? 'km' : 'miles'}. Try increasing distance.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Section 1: Immediate Crisis Support */}
              {(() => {
                const crisisItems = resources.filter(r => r.category === 'crisis' || r.type === 'crisis');
                if (crisisItems.length === 0) return null;
                return (
                  <div className="mb-6 bg-destructive/5 dark:bg-destructive/10 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-destructive" />
                      <h2 className="text-base font-semibold text-foreground" data-testid="text-crisis-section">Immediate Crisis Support</h2>
                      <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Always Available</Badge>
                    </div>
                    <div className="space-y-3">
                      {crisisItems.map((resource: any) => (
                        <div key={resource.id}>
                          <ResourceSchema resource={resource} />
                          <Card data-testid={`card-resource-${resource.id}`} className="border-destructive/30">
                            <CardHeader className="pb-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base sm:text-lg mb-1">{resource.organization || resource.name}</CardTitle>
                                    <p className="text-xs sm:text-sm text-muted-foreground">{resource.specialty}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="destructive" className="gap-1 text-xs" data-testid={`badge-crisis-${resource.id}`}>
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    24/7
                                  </Badge>
                                  {resource.isVerified && (
                                    <Badge variant="default" className="gap-1 text-xs bg-primary" data-testid={`badge-verified-${resource.id}`}>
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Verified
                                    </Badge>
                                  )}
                                  {resource.isFree && (
                                    <Badge variant="secondary" className="text-xs">Free</Badge>
                                  )}
                                  <Badge variant="outline" data-testid={`badge-nationwide-${resource.id}`} className="text-xs border-purple-500 text-purple-700 dark:text-purple-400">
                                    <Globe className="h-2.5 w-2.5 mr-1" />
                                    Nationwide
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {resource.address && (
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground break-words">{resource.address}</span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {resource.phone && (
                                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.open(`tel:${resource.phone}`)}>
                                    <Phone className="h-3 w-3 mr-1" />
                                    Call
                                  </Button>
                                )}
                                {resource.website && (
                                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.open(resource.website, '_blank')}>
                                    <Globe className="h-3 w-3 mr-1" />
                                    Website
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Section 2: Local Support Near You */}
              {(() => {
                const localItems = resources.filter(r => r.category !== 'crisis' && r.type !== 'crisis');
                if (localItems.length === 0 && userLocation) {
                  return (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-5 w-5 text-primary" />
                        <h2 className="text-base font-semibold text-foreground" data-testid="text-local-section">Local Support Near You</h2>
                      </div>
                      <Card className="bg-muted/30 border-0">
                        <CardContent className="pt-4 pb-4 text-center text-sm text-muted-foreground">
                          {userLocation.source === 'ip' 
                            ? "Enter your city or postal code for more accurate local results."
                            : `No local resources found within ${searchDistance} ${userLocation.isCanada ? 'km' : 'miles'}. Try increasing the distance.`
                          }
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (localItems.length === 0) return null;
                return (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="h-5 w-5 text-primary" />
                      <h2 className="text-base font-semibold text-foreground" data-testid="text-local-section">Local Support Near You</h2>
                    </div>
                    <div className="space-y-3">
                      {localItems.map((resource: any) => (
                        <div key={resource.id}>
                          <ResourceSchema resource={resource} />
                          <Card data-testid={`card-resource-${resource.id}`}>
                            <CardHeader className="pb-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base sm:text-lg mb-1">{resource.organization || resource.name}</CardTitle>
                                    <p className="text-xs sm:text-sm text-muted-foreground">{resource.specialty}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {resource.isVerified && (
                                    <Badge variant="default" className="gap-1 text-xs bg-primary" data-testid={`badge-verified-${resource.id}`}>
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Verified
                                    </Badge>
                                  )}
                                  {resource.isFree && (
                                    <Badge variant="secondary" className="text-xs">Free</Badge>
                                  )}
                                  {resource.isNationwide ? (
                                    <Badge variant="outline" data-testid={`badge-nationwide-${resource.id}`} className="text-xs border-purple-500 text-purple-700 dark:text-purple-400">
                                      <Globe className="h-2.5 w-2.5 mr-1" />
                                      Nationwide
                                    </Badge>
                                  ) : (resource.calculatedDistance !== undefined || resource.distance) && (
                                    <Badge variant="outline" data-testid={`badge-distance-${resource.id}`} className={`text-xs ${
                                      resource.proximityTier === 'local' 
                                        ? 'border-green-500 text-green-700 dark:text-green-400' 
                                        : resource.proximityTier === 'nearby' 
                                          ? 'border-blue-500 text-blue-700 dark:text-blue-400'
                                          : 'border-muted-foreground/50'
                                    }`}>
                                      <MapPin className="h-2.5 w-2.5 mr-1" />
                                      {resource.calculatedDistance ?? resource.distance} {userLocation?.isCanada ? 'km' : 'mi'}
                                      {resource.proximityTier === 'local' && ' (Local)'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {resource.address && (
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground break-words">{resource.address}</span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {resource.phone && (
                                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.open(`tel:${resource.phone}`)}>
                                    <Phone className="h-3 w-3 mr-1" />
                                    Call
                                  </Button>
                                )}
                                {resource.website && (
                                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.open(resource.website, '_blank')}>
                                    <Globe className="h-3 w-3 mr-1" />
                                    Website
                                  </Button>
                                )}
                                {resource.address && (
                                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => openInMaps(resource.address, resource.lat, resource.lng)}>
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Directions
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
        </>
        )}
      </div>
      </div>
    </>
  );
}
