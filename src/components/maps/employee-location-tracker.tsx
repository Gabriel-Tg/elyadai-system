"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MapPin, Square } from "lucide-react";
import { sendCurrentEmployeeLocationAction } from "@/services/escorts";

type TrackerStatus = "idle" | "tracking" | "unsupported" | "denied" | "error";

export function EmployeeLocationTracker({ escortId }: { escortId: string }) {
  const watchId = useRef<number | null>(null);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function sendPosition(position: GeolocationPosition) {
    const formData = new FormData();
    formData.set("escort_id", escortId);
    formData.set("latitude", String(position.coords.latitude));
    formData.set("longitude", String(position.coords.longitude));
    formData.set("accuracy_meters", String(position.coords.accuracy));
    await sendCurrentEmployeeLocationAction(formData);
    setLastSentAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }

  function startTracking() {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setLastError(null);
    setStatus("tracking");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        startTransition(async () => {
          try {
            await sendPosition(position);
          } catch (error) {
            setStatus("error");
            setLastError(error instanceof Error ? error.message : "Não foi possível enviar a localização.");
          }
        });
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
        setLastError(error.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }

  function stopTracking() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setStatus("idle");
  }

  useEffect(() => stopTracking, []);

  const helper = {
    denied: "Permita o acesso à localização no navegador do celular.",
    error: lastError ?? "Não foi possível obter a localização do celular.",
    idle: "Toque em iniciar durante a missão para transmitir o GPS do celular.",
    tracking: lastSentAt ? `Último envio às ${lastSentAt}.` : "Aguardando primeira leitura do GPS.",
    unsupported: "Este navegador não oferece suporte a GPS.",
  }[status];

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-950">GPS em tempo real</h2>
          <p className="mt-1 text-sm text-stone-700">{helper}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
          {status === "tracking" ? "Ativo" : "Parado"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={status === "tracking" || isPending} onClick={startTracking} type="button">
          <MapPin size={18} />
          Iniciar GPS
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-3 text-sm font-bold text-emerald-900" onClick={stopTracking} type="button">
          <Square size={18} />
          Parar
        </button>
      </div>
    </section>
  );
}