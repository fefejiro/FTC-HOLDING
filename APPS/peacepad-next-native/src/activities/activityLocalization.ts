import type { SupportedLocale } from "../localization/LocalizationProvider";
import type { ActivityWeather } from "./ActivitySuggestions";

type ActivityCopy = Readonly<{
  title: string;
  body: string;
  weather: string;
  ageRange: string;
  weatherFilter: string;
  ageFilter: string;
  allWeather: string;
  allAges: string;
  ageChoices: readonly string[];
  result: (count: number) => string;
  materials: string;
  plan: (title: string) => string;
  empty: string;
  weatherChoices: Readonly<Record<ActivityWeather, string>>;
}>;

const copy: Record<SupportedLocale, ActivityCopy> = {
  en: {
    title: "Activity ideas", body: "Practical ideas from the PeacePad activity library. Choose the conditions where you are; PeacePad does not use your location automatically.",
    weather: "Weather", ageRange: "Age range", weatherFilter: "Weather filter", ageFilter: "Age filter", allWeather: "Any weather", allAges: "All ages", ageChoices: ["Baby", "Toddler", "Preschool", "School age", "Teen"],
    result: (count) => `${count} ${count === 1 ? "idea" : "ideas"}`, materials: "You may need", plan: (title) => `Plan ${title} in calendar`, empty: "Try another weather or age range.",
    weatherChoices: { sunny: "Sunny", cloudy: "Cloudy", rainy: "Rainy", snowy: "Snowy", hot: "Hot", cold: "Cold" }
  },
  fr: {
    title: "Idées d'activités", body: "Des idées pratiques de la bibliothèque PeacePad. Choisissez les conditions chez vous; PeacePad n'utilise pas votre position automatiquement.",
    weather: "Météo", ageRange: "Âge", weatherFilter: "Filtre météo", ageFilter: "Filtre d'âge", allWeather: "Toute météo", allAges: "Tous les âges", ageChoices: ["Bébé", "Tout-petit", "Préscolaire", "Âge scolaire", "Adolescent"],
    result: (count) => `${count} ${count === 1 ? "idée" : "idées"}`, materials: "Vous pourriez avoir besoin de", plan: (title) => `Planifier ${title} au calendrier`, empty: "Essayez une autre météo ou tranche d'âge.",
    weatherChoices: { sunny: "Ensoleillé", cloudy: "Nuageux", rainy: "Pluvieux", snowy: "Neigeux", hot: "Chaud", cold: "Froid" }
  },
  es: {
    title: "Ideas de actividades", body: "Ideas prácticas de la biblioteca de PeacePad. Elige las condiciones donde estás; PeacePad no usa tu ubicación automáticamente.",
    weather: "Clima", ageRange: "Edad", weatherFilter: "Filtro de clima", ageFilter: "Filtro de edad", allWeather: "Cualquier clima", allAges: "Todas las edades", ageChoices: ["Bebé", "Niño pequeño", "Preescolar", "Edad escolar", "Adolescente"],
    result: (count) => `${count} ${count === 1 ? "idea" : "ideas"}`, materials: "Puede que necesites", plan: (title) => `Planificar ${title} en el calendario`, empty: "Prueba otro clima o rango de edad.",
    weatherChoices: { sunny: "Soleado", cloudy: "Nublado", rainy: "Lluvioso", snowy: "Nevado", hot: "Caluroso", cold: "Frío" }
  }
};

export function activityCopy(locale: SupportedLocale): ActivityCopy {
  return copy[locale];
}
