"use client";

import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

function mapsUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function mapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function MapsSearchField({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const canSearch = query.trim().length > 2;

  useEffect(() => {
    const search = query.trim();

    if (search.length < 3) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = await response.json() as AddressSuggestion[];
        setSuggestions(data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    setQuery(suggestion.display_name);
    setSearchedQuery(suggestion.display_name);
    setSuggestions([]);
  }

  const visibleSuggestions = canSearch ? suggestions : [];

  function searchCurrentQuery() {
    const firstSuggestion = visibleSuggestions[0];

    if (firstSuggestion) {
      selectSuggestion(firstSuggestion);
      return;
    }

    setSearchedQuery(query.trim());
  }

  return (
    <div className="md:col-span-2">
      <label className="block">
        <span className="field-label">{label}</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input className="field-control" name={name} onChange={(event) => setQuery(event.target.value)} required={required} type="text" value={query} />
          <Button disabled={!canSearch} onClick={searchCurrentQuery} type="button" variant="secondary">
            <Search size={18} /> {isSearching ? "Buscando" : "Buscar"}
          </Button>
        </div>
      </label>
      {visibleSuggestions.length ? (
        <div className="mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
          {visibleSuggestions.map((suggestion) => (
            <button className="flex w-full items-start gap-2 border-b border-[var(--border)] px-3 py-3 text-left text-sm text-[var(--muted-strong)] last:border-b-0 hover:bg-[var(--surface-elevated)] hover:text-white" key={`${suggestion.lat}-${suggestion.lon}`} onClick={() => selectSuggestion(suggestion)} type="button">
              <MapPin className="mt-0.5 shrink-0 text-[#79c0ff]" size={16} />
              <span>{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      ) : null}
      {searchedQuery ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[rgba(13,17,23,0.65)]">
          <iframe className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapsUrl(searchedQuery)} title={`Mapa de ${searchedQuery}`} />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] p-3 text-sm text-[var(--muted-strong)]">
            <span className="inline-flex items-center gap-2"><MapPin size={16} /> {searchedQuery}</span>
            <a className="font-bold text-[#79c0ff] underline-offset-4 hover:underline" href={mapsLink(searchedQuery)} rel="noreferrer" target="_blank">Abrir no Maps</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}