import Link from "next/link";
import { BarChart3, CalendarClock, CreditCard, LayoutDashboard, UserRound, UsersRound } from "lucide-react";
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
  return (
    <aside className="border-b border-stone-200 bg-stone-950 text-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:border-stone-800">
      <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:p-4">
        {roleLinks[role].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="inline-flex min-w-max items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-stone-200 hover:bg-white/10 hover:text-white"
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