import { useState, useEffect } from "react";

export function useFirstTimeTutorial(storageKey: string) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Tutorials are OFF by default - only show if user explicitly enabled them
    const enabled = localStorage.getItem(storageKey + "_enabled");
    setShowTutorial(enabled === "true");
    setIsLoaded(true);
  }, [storageKey]);

  const closeTutorial = (persist: boolean = true) => {
    if (persist) {
      localStorage.setItem(storageKey, 'true');
    }
    setShowTutorial(false);
  };

  const openTutorial = () => {
    setShowTutorial(true);
  };

  return { showTutorial, isLoaded, closeTutorial, openTutorial };
}
