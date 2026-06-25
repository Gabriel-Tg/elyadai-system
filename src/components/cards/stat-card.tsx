import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{label}</p>
          <strong className="mt-2 block font-display text-3xl text-stone-950">{value}</strong>
        </div>
        <span className="grid size-11 place-items-center rounded-md bg-stone-950 text-white">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-sm text-stone-600">{detail}</p>
    </div>
  );
}