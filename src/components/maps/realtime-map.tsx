"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { EscortLocation } from "@/types/database";

function formatCoordinate(value: number) {
  return Number(value).toFixed(6);
}

function formatRecordedAt(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function googleMapsEmbedUrl(location: EscortLocation) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&z=18&output=embed`;
}

function googleMapsLink(location: EscortLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

export function RealtimeMap({ escortId, initialLocations, trackedEmployeeId }: { escortId: string; initialLocations: EscortLocation[]; trackedEmployeeId?: string | null }) {
  const [locations, setLocations] = useState(() => initialLocations.filter((location) => !trackedEmployeeId || location.employee_id === trackedEmployeeId));
  const latest = locations.at(-1);

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

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      {latest ? (
        <iframe className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={googleMapsEmbedUrl(latest)} title="Localização atual no Google Maps" />
      ) : (
        <div className="absolute inset-0 map-grid" />
      )}
      <div className="absolute bottom-4 left-4 right-4 rounded-md border border-[var(--border)] bg-[rgba(13,17,23,0.86)] p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Localização Atual</p>
            <strong className="mt-1 block text-[var(--foreground)]">
              {latest ? `${formatCoordinate(latest.latitude)}, ${formatCoordinate(latest.longitude)}` : "Aguardando localização"}
            </strong>
            {latest ? <p className="mt-2 text-xs font-semibold text-[var(--muted-strong)]">Atualizado em {formatRecordedAt(latest.recorded_at)}{latest.accuracy_meters ? ` - precisão ${Math.round(Number(latest.accuracy_meters))}m` : ""}</p> : null}
          </div>
          {latest ? <a className="text-sm font-bold text-[#79c0ff] underline-offset-4 hover:underline" href={googleMapsLink(latest)} rel="noreferrer" target="_blank">Abrir no Google Maps</a> : null}
        </div>
      </div>
    </div>
  );
}