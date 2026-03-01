import { useState, useEffect, useCallback } from "react";

interface RecentSearch {
  query: string;
  timestamp: number;
  type?: string; // e.g., 'location', 'resource', 'general'
}

const MAX_RECENT_SEARCHES = 5;
const STORAGE_KEY = "peacepad-recent-searches";

/**
 * Hook to manage recent searches with localStorage persistence
 * Automatically deduplicates and limits to most recent searches
 */
export function useRecentSearches(searchType: string = 'general') {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allSearches: RecentSearch[] = JSON.parse(stored);
        // Filter by search type and sort by timestamp
        const filtered = allSearches
          .filter(s => !searchType || s.type === searchType)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_RECENT_SEARCHES)
          .map(s => s.query);
        setRecentSearches(filtered);
      }
    } catch (error) {
      console.error("Failed to load recent searches:", error);
    }
  }, [searchType]);

  /**
   * Add a search query to recent searches
   * Automatically deduplicates and maintains max count
   */
  const addRecentSearch = useCallback((query: string) => {
    if (!query || query.trim().length < 2) {
      return; // Don't save very short queries
    }

    try {
      // Load all searches
      const stored = localStorage.getItem(STORAGE_KEY);
      const allSearches: RecentSearch[] = stored ? JSON.parse(stored) : [];

      // Remove duplicates of the same query and type
      const filtered = allSearches.filter(
        s => !(s.query.toLowerCase() === query.toLowerCase() && s.type === searchType)
      );

      // Add new search at the beginning
      const updated: RecentSearch[] = [
        { query: query.trim(), timestamp: Date.now(), type: searchType },
        ...filtered
      ];

      // Limit total stored searches across all types (keep last 50)
      const trimmed = updated.slice(0, 50);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

      // Update state for current type
      const forType = trimmed
        .filter(s => s.type === searchType)
        .slice(0, MAX_RECENT_SEARCHES)
        .map(s => s.query);
      setRecentSearches(forType);
    } catch (error) {
      console.error("Failed to save recent search:", error);
    }
  }, [searchType]);

  /**
   * Clear all recent searches for this type
   */
  const clearRecentSearches = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allSearches: RecentSearch[] = JSON.parse(stored);
        // Keep searches of other types
        const filtered = allSearches.filter(s => s.type !== searchType);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      setRecentSearches([]);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  }, [searchType]);

  /**
   * Remove a specific search from recent searches
   */
  const removeRecentSearch = useCallback((query: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allSearches: RecentSearch[] = JSON.parse(stored);
        const filtered = allSearches.filter(
          s => !(s.query.toLowerCase() === query.toLowerCase() && s.type === searchType)
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        
        // Update state
        setRecentSearches(prev => prev.filter(q => q.toLowerCase() !== query.toLowerCase()));
      }
    } catch (error) {
      console.error("Failed to remove recent search:", error);
    }
  }, [searchType]);

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
  };
}
