"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { EscortLocation } from "@/types/database";

function positionFor(location: EscortLocation, locations: EscortLocation[]) {
  const latitudes = locations.map((item) => Number(item.latitude));
  const longitudes = locations.map((item) => Number(item.longitude));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = maxLat - minLat || 0.001;
  const lngSpan = maxLng - minLng || 0.001;

  return {
    left: `${12 + ((Number(location.longitude) - minLng) / lngSpan) * 76}%`,
    top: `${88 - ((Number(location.latitude) - minLat) / latSpan) * 76}%`,
  };
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
      <div className="absolute inset-0 map-grid" />
      <div className="absolute left-[10%] top-[22%] h-2 w-[82%] rotate-[-15deg] rounded-full bg-[rgba(210,153,34,0.72)] shadow-[var(--glow-yellow)]" />
      {locations.map((location, index) => (
        <span
          className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#7ee787] bg-[var(--operational-green)] text-xs font-bold text-white shadow-[var(--glow-green)]"
          key={location.id}
          style={positionFor(location, locations)}
          title={`${location.latitude}, ${location.longitude}`}
        >
          {index + 1}
        </span>
      ))}
      <div className="absolute bottom-4 left-4 right-4 rounded-md border border-[var(--border)] bg-[rgba(13,17,23,0.86)] p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Realtime ativo</p>
        <strong className="mt-1 block text-[var(--foreground)]">
          {latest ? `${Number(latest.latitude).toFixed(5)}, ${Number(latest.longitude).toFixed(5)}` : "Aguardando localização"}
        </strong>
      </div>
    </div>
  );
}