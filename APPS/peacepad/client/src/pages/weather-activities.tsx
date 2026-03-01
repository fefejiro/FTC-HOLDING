import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WeatherActivity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// @ts-ignore
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer, Sparkles, Filter } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";

const AGE_RANGES = [
  { label: "All Ages", value: "all" },
  { label: "Baby (0-1 year)", value: "6" },
  { label: "Toddler (1-3 years)", value: "24" },
  { label: "Preschool (3-5 years)", value: "48" },
  { label: "School Age (6-12 years)", value: "96" },
  { label: "Teen (13+ years)", value: "168" },
];

const WEATHER_ICONS: Record<string, any> = {
  sunny: Sun,
  rainy: CloudRain,
  snowy: CloudSnow,
  cloudy: Cloud,
  windy: Wind,
  hot: Thermometer,
  cold: Thermometer,
};

export default function WeatherActivitiesPage() {
  const [selectedAge, setSelectedAge] = useState("all");
  const [currentWeather, setCurrentWeather] = useState<string>("");
  const [weatherCondition, setWeatherCondition] = useState("all");

  useEffect(() => {
    const getLocationAndWeather = async () => {
      // Try GPS first with a 5-second timeout
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('GPS timeout')), 5000);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeoutId);
                resolve(pos);
              },
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            );
          });
          fetchWeather(position.coords.latitude, position.coords.longitude);
          return;
        } catch (gpsError) {
          console.log("[Weather] GPS failed, trying IP fallback...", gpsError);
        }
      }

      // Fallback to IP-based geolocation
      try {
        const res = await fetch('/api/geocode/ip', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.lat && data.lng) {
            console.log("[Weather] Using IP location:", data.displayName);
            fetchWeather(data.lat, data.lng);
            return;
          }
        }
      } catch (ipError) {
        console.log("[Weather] IP geolocation also failed:", ipError);
      }
    };

    getLocationAndWeather();
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
      );
      const data = await response.json();
      const temp = data.current.temperature_2m;
      const weatherCode = data.current.weather_code;

      let condition = "sunny";
      if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) condition = "rainy";
      else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) condition = "snowy";
      else if ([1, 2, 3, 45, 48].includes(weatherCode)) condition = "cloudy";
      
      if (temp > 28) condition = "hot";
      else if (temp < 5) condition = "cold";

      setCurrentWeather(condition);
      setWeatherCondition(condition);
    } catch (error) {
      console.error("Weather fetch failed:", error);
    }
  };

  const { data: activities = [], isLoading } = useQuery<WeatherActivity[]>({
    queryKey: ["/api/weather-activities", selectedAge, weatherCondition],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAge && selectedAge !== "all") {
        params.append("childAgeMonths", selectedAge);
      }
      if (weatherCondition && weatherCondition !== "all") {
        params.append("weatherCondition", weatherCondition);
      }
      const url = `/api/weather-activities${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return await res.json();
    },
  });

  const WeatherIcon = currentWeather ? WEATHER_ICONS[currentWeather] : Sparkles;

  return (
    <>
      <SEOHead title="Weather Activities" description="Weather-based activity suggestions for kids" noindex />
      <div className="flex flex-col items-center w-full">
        <div className="p-4 sm:p-6 max-w-2xl w-full space-y-6 pb-20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <WeatherIcon className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">Activity Suggestions</h1>
            </div>
          </div>

          {currentWeather && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/10 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <WeatherIcon className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">
                    Current weather: <span className="capitalize">{currentWeather}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Filter Activities</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Child's Age</label>
                  <Select value={selectedAge} onValueChange={setSelectedAge}>
                    <SelectTrigger data-testid="select-age-filter">
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Weather</label>
                  <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                    <SelectTrigger data-testid="select-weather-filter">
                      <SelectValue placeholder="All weather" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All weather</SelectItem>
                      <SelectItem value="sunny">Sunny</SelectItem>
                      <SelectItem value="rainy">Rainy</SelectItem>
                      <SelectItem value="snowy">Snowy</SelectItem>
                      <SelectItem value="cloudy">Cloudy</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                      <SelectItem value="windy">Windy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(selectedAge !== "all" || (weatherCondition !== "all" && weatherCondition !== currentWeather)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSelectedAge("all");
                    setWeatherCondition(currentWeather || "all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Reset Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activities found for the selected filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6" data-testid="activities-list">
              {activities.map((activity) => (
                <Card key={activity.id} className="hover-elevate border-primary/5 overflow-hidden group" data-testid={`activity-card-${activity.id}`}>
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">{activity.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/20 shadow-sm">{activity.activityType}</Badge>
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 bg-muted/40">{activity.category}</Badge>
                        {activity.durationMinutes && (
                          <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider flex-shrink-0">{activity.durationMinutes} min</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{activity.description}</p>
                    {activity.materialsNeeded && activity.materialsNeeded.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Materials needed:</p>
                        <div className="flex flex-wrap gap-2">
                          {activity.materialsNeeded.map((material, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
