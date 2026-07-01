"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { EscortLocation } from "@/types/database";

type RouteInfo = {
  distanceKm: number;
  durationMinutes: number;
};

type GeocodeResult = {
  lat: string;
  lon: string;
};

function formatCoordinate(value: number) {
  return Number(value).toFixed(6);
}

function formatRecordedAt(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function googleMapsEmbedUrl(location: EscortLocation) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

  if (!apiKey) return null;

  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&zoom=18`;
}

function googleMapsRouteEmbedUrl(location: EscortLocation, destination: string) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

  if (!apiKey) return null;

  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(apiKey)}&origin=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&destination=${encodeURIComponent(destination)}&mode=driving`;
}

function googleMapsLink(location: EscortLocation, destination?: string) {
  if (destination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}min`;
}

async function estimateRoute(location: EscortLocation, destination: string, signal: AbortSignal): Promise<RouteInfo | null> {
  const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(destination)}`, { signal });

  if (!geocodeResponse.ok) return null;

  const geocode = await geocodeResponse.json() as GeocodeResult[];
  const target = geocode[0];

  if (!target) return null;

  const routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${Number(location.longitude)},${Number(location.latitude)};${Number(target.lon)},${Number(target.lat)}?overview=false`, { signal });

  if (!routeResponse.ok) return null;

  const routeData = await routeResponse.json() as { routes?: Array<{ distance: number; duration: number }> };
  const route = routeData.routes?.[0];

  if (!route) return null;

  return {
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
}

export function RealtimeMap({ destination, escortId, initialLocations, trackedEmployeeId }: { destination: string; escortId: string; initialLocations: EscortLocation[]; trackedEmployeeId?: string | null }) {
  const [locations, setLocations] = useState(() => initialLocations.filter((location) => !trackedEmployeeId || location.employee_id === trackedEmployeeId));
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const latest = locations.at(-1);
  const embedUrl = latest ? destination ? googleMapsRouteEmbedUrl(latest, destination) : googleMapsEmbedUrl(latest) : null;

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`escort-locations-${escortId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "escort_locations", filter: `escort_id=eq.${escortId}` },
        (payload) => {
          const location = payload.new as EscortLocation;

          if (trackedEmployeeId && location.employee_id !== trackedEmployeeId) {
            return;
          }

          setLocations((current) => [...current, location]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [escortId, trackedEmployeeId]);

  useEffect(() => {
    if (!latest || !destination.trim()) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRouteStatus("loading");
      try {
        const route = await estimateRoute(latest, destination, controller.signal);
        setRouteInfo(route);
        setRouteStatus(route ? "ready" : "unavailable");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setRouteInfo(null);
          setRouteStatus("unavailable");
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [destination, latest]);

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      {embedUrl ? (
        <iframe className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={embedUrl} title="Rota até o destino no Google Maps" />
      ) : (
        <div className="absolute inset-0 map-grid">
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-md rounded-lg border border-[var(--border)] bg-[rgba(13,17,23,0.86)] p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Google Maps</p>
              <h2 className="mt-2 font-display text-xl font-bold text-[var(--foreground)]">Abrir rota externa</h2>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">Para exibir a rota dentro da tela, configure `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`. Enquanto isso, a rota abre diretamente no Google Maps.</p>
              {latest ? <a className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--tactical-blue)] bg-[var(--tactical-blue)] px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[var(--glow-blue)]" href={googleMapsLink(latest, destination)} rel="noreferrer" target="_blank">Abrir rota no Google Maps</a> : null}
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 rounded-md border border-[var(--border)] bg-[rgba(13,17,23,0.9)] p-5 shadow-sm backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Localização atual até o destino</p>
            <strong className="mt-1 block text-[var(--foreground)]">
              {latest ? `${formatCoordinate(latest.latitude)}, ${formatCoordinate(latest.longitude)}` : "Aguardando localização"}
            </strong>
            {latest ? <p className="mt-2 text-xs font-semibold text-[var(--muted-strong)]">Atualizado em {formatRecordedAt(latest.recorded_at)}{latest.accuracy_meters ? ` - precisão ${Math.round(Number(latest.accuracy_meters))}m` : ""}</p> : null}
            <p className="mt-2 text-sm font-semibold text-[var(--muted-strong)]">Destino: {destination}</p>
          </div>
          <div className="grid gap-2 text-left lg:text-right">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Previsão de chegada</p>
              <strong className="font-display text-2xl text-[#7ee787]">
                {routeInfo ? formatDuration(routeInfo.durationMinutes) : routeStatus === "loading" ? "Calculando" : "-"}
              </strong>
              {routeInfo ? <p className="text-xs font-semibold text-[var(--muted-strong)]">{routeInfo.distanceKm.toFixed(1)} km estimados</p> : routeStatus === "unavailable" ? <p className="text-xs font-semibold text-[#f0d18a]">Rota indisponível no momento</p> : null}
            </div>
            {latest ? <a className="text-sm font-bold text-[#79c0ff] underline-offset-4 hover:underline" href={googleMapsLink(latest, destination)} rel="noreferrer" target="_blank">Abrir rota no Google Maps</a> : null}
          </div>
        </div>
      </div>
    </div>
  );
}