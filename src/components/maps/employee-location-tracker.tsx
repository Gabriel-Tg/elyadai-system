"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MapPin, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
    idle: "Ative o GPS para transmitir a localização em tempo real durante a missão.",
    tracking: lastSentAt ? `Último envio às ${lastSentAt}.` : "Aguardando primeira leitura do GPS.",
    unsupported: "Este navegador não oferece suporte a GPS.",
  }[status];

  return (
    <section className="rounded-lg border border-[var(--operational-green)] bg-[rgba(35,134,54,0.1)] p-5 shadow-[var(--glow-green)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--foreground)]">GPS em tempo real</h2>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{helper}</p>
        </div>
        <StatusBadge tone={status === "tracking" ? "success" : "neutral"} value={status === "tracking" ? "Ativo" : "Parado"} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="w-full" disabled={status === "tracking" || isPending} onClick={startTracking} type="button" variant="success">
          <MapPin size={18} />
          Ativar GPS
        </Button>
        <Button className="w-full" onClick={stopTracking} type="button" variant="secondary">
          <Square size={18} />
          Parar
        </Button>
      </div>
    </section>
  );
}