import type { SupportedLocale } from "../localization/LocalizationProvider";
import type { ActivityWeather } from "./ActivitySuggestions";

type ActivityCopy = Readonly<{
  title: string;
  body: string;
  locationPrivacy: string;
  weather: string;
  ageRange: string;
  weatherFilter: string;
  ageFilter: string;
  allWeather: string;
  allAges: string;
  weatherPlace: string;
  weatherPlacePlaceholder: string;
  useCurrentWeather: string;
  loadingWeather: string;
  weatherUnavailable: string;
  currentWeather: (place: string, condition: string, temperature: string) => string;
  ageChoices: readonly string[];
  result: (count: number) => string;
  materials: string;
  plan: (title: string) => string;
  empty: string;
  weatherChoices: Readonly<Record<ActivityWeather, string>>;
}>;

const copy: Record<SupportedLocale, ActivityCopy> = {
  en: {
    title: "Activity ideas", body: "Practical ideas from the PeacePad activity library. Choose a place or the conditions to find an idea that fits your time together.",
    locationPrivacy: "PeacePad does not use your location automatically. Enter a city or region only when you want a weather check.",
    weather: "Weather", ageRange: "Age range", weatherFilter: "Weather filter", ageFilter: "Age filter", allWeather: "Any weather", allAges: "All ages", ageChoices: ["Baby", "Toddler", "Preschool", "School age", "Teen"],
    weatherPlace: "Check a place's weather", weatherPlacePlaceholder: "City or region", useCurrentWeather: "Check weather", loadingWeather: "Checking weather...", weatherUnavailable: "Weather could not be loaded. Try again or choose a condition.", currentWeather: (place, condition, temperature) => `${place}: ${condition}, ${temperature} °C`,
    result: (count) => `${count} ${count === 1 ? "idea" : "ideas"}`, materials: "You may need", plan: (title) => `Plan ${title} in calendar`, empty: "Try another weather or age range.",
    weatherChoices: { sunny: "Sunny", cloudy: "Cloudy", rainy: "Rainy", snowy: "Snowy", hot: "Hot", cold: "Cold" }
  },
  fr: {
    locationPrivacy: "PeacePad n’utilise pas automatiquement votre position. Saisissez une ville ou une région uniquement lorsque vous souhaitez vérifier la météo.",
    title: "Idées d'activités", body: "Des idées pratiques de la bibliothèque PeacePad. Choisissez un lieu ou les conditions pour trouver une idée adaptée à votre moment ensemble.",
    weather: "Météo", ageRange: "Âge", weatherFilter: "Filtre météo", ageFilter: "Filtre d'âge", allWeather: "Toute météo", allAges: "Tous les âges", ageChoices: ["Bébé", "Tout-petit", "Préscolaire", "Âge scolaire", "Adolescent"],
    weatherPlace: "Météo d'un lieu", weatherPlacePlaceholder: "Ville ou région", useCurrentWeather: "Vérifier la météo", loadingWeather: "Vérification...", weatherUnavailable: "La météo n'est pas disponible. Réessayez ou choisissez une condition.", currentWeather: (place, condition, temperature) => `${place} : ${condition}, ${temperature} °C`,
    result: (count) => `${count} ${count === 1 ? "idée" : "idées"}`, materials: "Vous pourriez avoir besoin de", plan: (title) => `Planifier ${title} au calendrier`, empty: "Essayez une autre météo ou tranche d'âge.",
    weatherChoices: { sunny: "Ensoleillé", cloudy: "Nuageux", rainy: "Pluvieux", snowy: "Neigeux", hot: "Chaud", cold: "Froid" }
  },
  es: {
    locationPrivacy: "PeacePad no usa tu ubicación automáticamente. Escribe una ciudad o región solo cuando quieras consultar el clima.",
    title: "Ideas de actividades", body: "Ideas prácticas de la biblioteca de PeacePad. Elige un lugar o las condiciones para encontrar una idea adecuada para su tiempo juntos.",
    weather: "Clima", ageRange: "Edad", weatherFilter: "Filtro de clima", ageFilter: "Filtro de edad", allWeather: "Cualquier clima", allAges: "Todas las edades", ageChoices: ["Bebé", "Niño pequeño", "Preescolar", "Edad escolar", "Adolescente"],
    weatherPlace: "Clima de un lugar", weatherPlacePlaceholder: "Ciudad o región", useCurrentWeather: "Consultar clima", loadingWeather: "Consultando...", weatherUnavailable: "No se pudo cargar el clima. Inténtalo de nuevo o elige una condición.", currentWeather: (place, condition, temperature) => `${place}: ${condition}, ${temperature} °C`,
    result: (count) => `${count} ${count === 1 ? "idea" : "ideas"}`, materials: "Puede que necesites", plan: (title) => `Planificar ${title} en el calendario`, empty: "Prueba otro clima o rango de edad.",
    weatherChoices: { sunny: "Soleado", cloudy: "Nublado", rainy: "Lluvioso", snowy: "Nevado", hot: "Caluroso", cold: "Frío" }
  }
};

export function activityCopy(locale: SupportedLocale): ActivityCopy {
  return copy[locale];
}
