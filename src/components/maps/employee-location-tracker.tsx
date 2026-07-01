"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
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

  const stopTracking = useCallback(function stopTracking() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const sendPosition = useCallback(async function sendPosition(position: GeolocationPosition) {
    const formData = new FormData();
    formData.set("escort_id", escortId);
    formData.set("latitude", String(position.coords.latitude));
    formData.set("longitude", String(position.coords.longitude));
    formData.set("accuracy_meters", String(position.coords.accuracy));
    await sendCurrentEmployeeLocationAction(formData);
    setLastSentAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [escortId]);

  const startTracking = useCallback(function startTracking() {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    stopTracking();

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
  }, [sendPosition, stopTracking]);

  useEffect(() => {
    const timeout = window.setTimeout(() => startTracking(), 0);

    return () => {
      window.clearTimeout(timeout);
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  const helper = {
    denied: "A localização é obrigatória durante a missão. Autorize o GPS para continuar transmitindo.",
    error: lastError ?? "Não foi possível obter a localização do celular.",
    idle: "Solicitando autorização do GPS.",
    tracking: lastSentAt ? `Último envio às ${lastSentAt}.` : "Aguardando primeira leitura do GPS.",
    unsupported: "Este navegador não oferece suporte a GPS.",
  }[status];
  const needsPermissionRetry = status === "denied" || status === "error" || status === "unsupported";

  return (
    <section className={`rounded-lg border p-5 ${needsPermissionRetry ? "border-[var(--alert-red)] bg-[rgba(218,54,51,0.12)] shadow-[var(--glow-red)]" : "border-[var(--operational-green)] bg-[rgba(35,134,54,0.1)] shadow-[var(--glow-green)]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--foreground)]">GPS em tempo real</h2>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{helper}</p>
        </div>
        <StatusBadge tone={status === "tracking" ? "success" : needsPermissionRetry ? "danger" : "neutral"} value={status === "tracking" ? "Ativo" : needsPermissionRetry ? "GPS obrigatório" : "Solicitando"} />
      </div>
      {needsPermissionRetry ? (
        <div className="mt-4">
          <Button className="w-full" disabled={isPending} onClick={startTracking} type="button" variant="danger">
            <AlertTriangle size={18} /> Autorizar GPS novamente
          </Button>
        </div>
      ) : status === "tracking" ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#7ee787]"><MapPin size={18} /> Transmissão automática ativa</p>
      ) : null}
    </section>
  );
}