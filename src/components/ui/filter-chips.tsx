import Link from "next/link";
import type { ReactNode } from "react";

export function FilterChips({ children, label = "Filtros operacionais" }: { children: ReactNode; label?: string }) {
  return (
    <div className="mb-6 rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.78)] p-3">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function FilterChip({ active, children, href }: { active?: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.1em]",
        active
          ? "border-[var(--tactical-blue)] bg-[rgba(31,111,235,0.2)] text-white shadow-[var(--glow-blue)]"
          : "border-[var(--border)] bg-[rgba(13,17,23,0.72)] text-[var(--muted-strong)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-white",
      ].join(" ")}
      href={href}
    >
      {children}
    </Link>
  );
}