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
    <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-stone-200 bg-[#dfe9dd] shadow-sm">
      <div className="absolute inset-0 map-grid" />
      <div className="absolute left-[10%] top-[22%] h-2 w-[82%] rotate-[-15deg] rounded-full bg-amber-500/70" />
      {locations.map((location, index) => (
        <span
          className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-emerald-700 text-xs font-bold text-white shadow-lg"
          key={location.id}
          style={positionFor(location, locations)}
          title={`${location.latitude}, ${location.longitude}`}
        >
          {index + 1}
        </span>
      ))}
      <div className="absolute bottom-4 left-4 right-4 rounded-md border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Realtime ativo</p>
        <strong className="mt-1 block text-stone-950">
          {latest ? `${Number(latest.latitude).toFixed(5)}, ${Number(latest.longitude).toFixed(5)}` : "Aguardando localização"}
        </strong>
      </div>
    </div>
  );
}