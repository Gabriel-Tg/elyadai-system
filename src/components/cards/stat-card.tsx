import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type StatTone = "blue" | "green" | "red" | "yellow" | "neutral";

const toneClasses: Record<StatTone, { accent: string; icon: string }> = {
  blue: {
    accent: "bg-[var(--tactical-blue)] shadow-[var(--glow-blue)]",
    icon: "border-[var(--tactical-blue)] bg-[rgba(31,111,235,0.16)] text-[#79c0ff] shadow-[var(--glow-blue)] hover:bg-[rgba(31,111,235,0.26)]",
  },
  green: {
    accent: "bg-[var(--operational-green)] shadow-[var(--glow-green)]",
    icon: "border-[var(--operational-green)] bg-[rgba(35,134,54,0.16)] text-[#7ee787] shadow-[var(--glow-green)] hover:bg-[rgba(35,134,54,0.26)]",
  },
  red: {
    accent: "bg-[var(--alert-red)] shadow-[var(--glow-red)]",
    icon: "border-[var(--alert-red)] bg-[rgba(218,54,51,0.16)] text-[#ffb4b2] shadow-[var(--glow-red)] hover:bg-[rgba(218,54,51,0.26)]",
  },
  yellow: {
    accent: "bg-[var(--attention-yellow)] shadow-[var(--glow-yellow)]",
    icon: "border-[var(--attention-yellow)] bg-[rgba(210,153,34,0.14)] text-[#f0d18a] shadow-[var(--glow-yellow)] hover:bg-[rgba(210,153,34,0.24)]",
  },
  neutral: {
    accent: "bg-[var(--border-strong)]",
    icon: "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]",
  },
};

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconHref,
  iconLabel,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  iconHref?: string;
  iconLabel?: string;
  tone?: StatTone;
}) {
  const iconContent = <Icon size={20} />;
  const classes = toneClasses[tone];

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.92)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <span className={["absolute inset-x-0 top-0 h-1", classes.accent].join(" ")} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
          <strong className="mt-2 block font-display text-3xl text-[var(--foreground)]">{value}</strong>
        </div>
        {iconHref ? (
          <Link
            aria-label={iconLabel ?? `Abrir ${label}`}
            className={["grid size-11 place-items-center rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--tactical-blue)] focus:ring-offset-2 focus:ring-offset-[var(--background)]", classes.icon].join(" ")}
            href={iconHref}
            title={iconLabel ?? `Abrir ${label}`}
          >
            {iconContent}
          </Link>
        ) : (
          <span className={["grid size-11 place-items-center rounded-md border", classes.icon].join(" ")}>
            {iconContent}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-[var(--muted-strong)]">{detail}</p>
    </div>
  );
}