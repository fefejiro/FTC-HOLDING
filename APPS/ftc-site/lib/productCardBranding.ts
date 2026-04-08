import type { StaticImageData } from "next/image";
import dispatchLogo from "../../dispatch/client/public/icon-192.png";
import peacepadLogo from "../../peacepad/client/public/peacepad-icon.png";
import saywetinLogo from "../../saywetin/client/public/app-icon.jpg";
import { ateamModeSupportPoints, ateamModeSummary } from "./ateamMode";

export interface ProductCardLogo {
  src: StaticImageData;
  alt: string;
  width: number;
  height: number;
}

export interface ProductCardBranding {
  offerCopy: string;
  secondaryLabel: string;
  supportPoints?: string[];
  logo?: ProductCardLogo;
}

export const productCardBranding: Record<string, ProductCardBranding> = {
  peacepad: {
    offerCopy:
      "A communication product built to slow escalation before a message is sent.",
    secondaryLabel: "See PeacePad overview",
    supportPoints: [
      "Pause before sending",
      "Review tone before delivery",
      "Choose a calmer next action"
    ],
    logo: {
      src: peacepadLogo,
      alt: "PeacePad logo",
      width: peacepadLogo.width,
      height: peacepadLogo.height
    }
  },
  saywetin: {
    offerCopy:
      "A cultural interpretation product that helps users understand Nigerian music and language context.",
    secondaryLabel: "See SayWetin overview",
    supportPoints: [
      "Recognize songs",
      "Explain slang and references",
      "Add context, not just metadata"
    ],
    logo: {
      src: saywetinLogo,
      alt: "SayWetin logo",
      width: saywetinLogo.width,
      height: saywetinLogo.height
    }
  },
  dispatch: {
    offerCopy:
      "A live roadside dispatch product for Ottawa with direct customer intake, operator routing, and incident watch.",
    secondaryLabel: "See Dispatch overview",
    supportPoints: [
      "Roadside request intake",
      "Operator movement with live updates",
      "Official no-key incident sources"
    ],
    logo: {
      src: dispatchLogo,
      alt: "Dispatch logo",
      width: dispatchLogo.width,
      height: dispatchLogo.height
    }
  },
  ateam: {
    offerCopy: ateamModeSummary,
    secondaryLabel: "Enter ATEAM",
    supportPoints: [...ateamModeSupportPoints]
  }
};
