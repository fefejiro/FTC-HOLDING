"use client";

import { useEffect, useMemo, useState } from "react";

type Suggestion = {
  id: string;
  label: string;
  address: string;
  city?: string;
  region?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Props = {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSuggestionSelect?: (suggestion: Suggestion) => void;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
};

export default function GardenAddressAutocompleteInput({
  name,
  value,
  onValueChange,
  onSuggestionSelect,
  required,
  placeholder,
  autoComplete = "street-address",
  minLength = 3
}: Props) {
  const [internalValue, setInternalValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteConfigured, setAutocompleteConfigured] = useState<boolean | null>(null);

  const currentValue = useMemo(() => (typeof value === "string" ? value : internalValue), [value, internalValue]);

  useEffect(() => {
    if (typeof value === "string") {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const query = currentValue.trim();
    if (query.length < minLength) {
      setSuggestions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/garden-cleaners-address-autocomplete?q=${encodeURIComponent(query)}`);
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          configured?: boolean;
          suggestions?: Suggestion[];
        };

        if (body.configured === false) {
          setAutocompleteConfigured(false);
          setSuggestions([]);
          return;
        }

        setAutocompleteConfigured(true);
        setSuggestions(Array.isArray(body.suggestions) ? body.suggestions : []);
      } catch {
        setAutocompleteConfigured(false);
        setSuggestions([]);
      }
    }, 260);

    return () => clearTimeout(handle);
  }, [currentValue, minLength]);

  function handleValueChange(next: string) {
    if (typeof value !== "string") {
      setInternalValue(next);
    }
    onValueChange?.(next);
  }

  function chooseSuggestion(suggestion: Suggestion) {
    handleValueChange(suggestion.label || suggestion.address || "");
    setSuggestions([]);
    setShowSuggestions(false);
    onSuggestionSelect?.(suggestion);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        name={name}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder || "123 Main Street"}
        value={currentValue}
        onChange={(event) => handleValueChange(event.currentTarget.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 120);
        }}
      />

      {showSuggestions && suggestions.length > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 20,
            background: "#fff",
            border: "1px solid rgba(23, 61, 49, 0.16)",
            borderRadius: 10,
            boxShadow: "0 10px 24px rgba(23, 61, 49, 0.12)",
            maxHeight: 260,
            overflowY: "auto"
          }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={() => chooseSuggestion(suggestion)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid rgba(23, 61, 49, 0.08)",
                padding: "10px 12px",
                cursor: "pointer",
                color: "#173d31"
              }}
            >
              <strong style={{ display: "block" }}>{suggestion.address || suggestion.label}</strong>
              <span style={{ fontSize: 12, color: "#5e726a" }}>{suggestion.city || ""}{suggestion.region ? `, ${suggestion.region}` : ""}{suggestion.postalCode ? ` ${suggestion.postalCode}` : ""}</span>
            </button>
          ))}
        </div>
      ) : null}

      {autocompleteConfigured === false ? (
        <p className="muted" style={{ marginTop: 6, fontSize: "0.82rem" }}>
          Address autocomplete is not configured right now. Manual address entry is enabled.
        </p>
      ) : null}
    </div>
  );
}
