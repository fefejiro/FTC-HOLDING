import { useState, useRef, useEffect } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { cn } from "@/lib/utils";

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  searchType?: string;
  suggestions?: string[]; // Popular/suggested searches to show
  disabled?: boolean;
}

/**
 * Smart search input with recent searches and suggestions
 * Features:
 * - Shows recent searches when focused (empty input)
 * - Shows popular suggestions if no recent searches
 * - Click to select from recent/suggested searches
 * - Clear individual recent searches
 * - Keyboard navigation support
 */
export function SmartSearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
  searchType = 'general',
  suggestions = [],
  disabled = false,
}: SmartSearchInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recentSearches, addRecentSearch, removeRecentSearch } = useRecentSearches(searchType);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      addRecentSearch(query);
      onSearch(query);
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    handleSearch(suggestion);
  };

  const handleRemoveRecent = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      handleSearch(value);
    }
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  // Show dropdown when focused and either has recent searches or suggestions
  const shouldShowDropdown = showDropdown && !value && (recentSearches.length > 0 || suggestions.length > 0);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={cn("pl-9 pr-20", className)}
          disabled={disabled}
          data-testid="input-smart-search"
        />
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleClear}
              className="h-7 w-7"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => handleSearch(value)}
            disabled={!value.trim() || disabled}
            className="h-7"
            data-testid="button-search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {shouldShowDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2 border-b">
                <Clock className="h-3 w-3" />
                Recent Searches
              </div>
              {recentSearches.map((query, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleSelectSuggestion(query)}
                  className="w-full text-left p-3 hover-elevate active-elevate-2 border-b last:border-b-0 focus:outline-none group"
                  data-testid={`recent-search-${index}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{query}</span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleRemoveRecent(query, e)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-remove-recent-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Suggested Searches */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2 border-b">
                <TrendingUp className="h-3 w-3" />
                {recentSearches.length > 0 ? 'Suggested' : 'Popular Searches'}
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left p-3 hover-elevate active-elevate-2 border-b last:border-b-0 focus:outline-none"
                  data-testid={`suggestion-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
