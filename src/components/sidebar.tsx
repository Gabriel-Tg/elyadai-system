"use client";

import Link from "next/link";
import { BarChart3, CalendarClock, CreditCard, LayoutDashboard, Shield, UserRound, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/database";

const supervisorLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: UsersRound },
  { href: "/funcionarios", label: "Funcionários", icon: UserRound },
  { href: "/agendamentos", label: "Agendamentos", icon: CalendarClock },
  { href: "/financeiro", label: "Financeiro", icon: CreditCard },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const roleLinks: Record<UserRole, typeof supervisorLinks> = {
  supervisor: supervisorLinks,
  cliente: [{ href: "/cliente/dashboard", label: "Meu painel", icon: LayoutDashboard }],
  funcionario: [{ href: "/funcionario/dashboard", label: "Minhas missões", icon: LayoutDashboard }],
};

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-[var(--border)] bg-[rgba(13,17,23,0.94)] text-white backdrop-blur lg:min-h-screen lg:w-68 lg:border-b-0 lg:border-r">
      <div className="hidden border-b border-[var(--border)] p-4 lg:block">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md border border-[var(--tactical-blue)] bg-[rgba(31,111,235,0.16)] text-[#79c0ff] shadow-[var(--glow-blue)]">
            <Shield size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Centro tático</p>
            <strong className="font-display text-sm uppercase tracking-[0.08em] text-white">Elyadai</strong>
          </div>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:p-4" aria-label="Navegação principal">
        {roleLinks[role].map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex min-w-max items-center gap-3 rounded-md border px-3 py-3 text-sm font-bold",
                isActive
                  ? "border-[var(--tactical-blue)] bg-[rgba(31,111,235,0.2)] text-white shadow-[var(--glow-blue)]"
                  : "border-transparent text-[var(--muted-strong)] hover:border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-white",
              ].join(" ")}
              href={item.href}
              key={item.href}
            >
              <Icon size={18} /> {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}