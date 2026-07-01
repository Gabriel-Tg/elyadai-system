type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const statusToneByValue: Record<string, StatusTone> = {
  Agendada: "warning",
  "Em andamento": "info",
  Finalizada: "success",
  Cancelada: "danger",
  Reagendada: "warning",
  disponivel: "success",
  ocupado: "info",
  folga: "neutral",
  pago: "success",
  pendente: "warning",
  atrasado: "danger",
};

const toneClasses: Record<StatusTone, string> = {
  success: "border-[var(--operational-green)] bg-[rgba(35,134,54,0.16)] text-[#7ee787] shadow-[var(--glow-green)]",
  warning: "border-[var(--attention-yellow)] bg-[rgba(210,153,34,0.14)] text-[#f0d18a] shadow-[var(--glow-yellow)]",
  danger: "border-[var(--alert-red)] bg-[rgba(218,54,51,0.16)] text-[#ffb4b2] shadow-[var(--glow-red)]",
  info: "border-[var(--tactical-blue)] bg-[rgba(31,111,235,0.16)] text-[#79c0ff] shadow-[var(--glow-blue)]",
  neutral: "border-[var(--border)] bg-[rgba(139,148,158,0.12)] text-[var(--muted-strong)]",
};

export function statusTone(value: string) {
  return statusToneByValue[value] ?? "neutral";
}

export function StatusBadge({ value, tone = statusTone(value) }: { value: string; tone?: StatusTone }) {
  return (
    <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em]", toneClasses[tone]].join(" ")}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {value}
    </span>
  );
}