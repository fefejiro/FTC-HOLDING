"use client";

import { useEffect } from "react";

export default function HeroSpotlight() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".spotlight-hero");
    if (!hero) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      hero.style.setProperty("--spot-x", `${x}px`);
      hero.style.setProperty("--spot-y", `${y}px`);
    };

    const onLeave = () => {
      hero.style.setProperty("--spot-x", "50%");
      hero.style.setProperty("--spot-y", "35%");
    };

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);

    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
