import { CalendarClock, CheckCircle2, CreditCard, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { getSupervisorDashboard } from "@/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile(["supervisor"]);
  const data = await getSupervisorDashboard();

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Supervisor</p>
          <h1 className="font-display text-3xl font-bold text-stone-950">Dashboard principal</h1>
        </div>
        <Link className="rounded-md bg-stone-950 px-4 py-3 text-sm font-bold text-white" href="/agendamentos/novo">Nova escolta</Link>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard detail="Funcionários aptos para escala" icon={UsersRound} label="Disponíveis" value={data.availableEmployees} />
        <StatCard detail="Funcionários em missão" icon={MapPin} label="Em missão" value={data.busyEmployees} />
        <StatCard detail="Agendamentos do dia" icon={CalendarClock} label="Hoje" value={data.todayMissions} />
        <StatCard detail="Rastreamento ativo" icon={MapPin} label="Andamento" value={data.inProgressMissions} />
        <StatCard detail="Fechadas operacionalmente" icon={CheckCircle2} label="Finalizadas" value={data.finishedMissions} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <RecordTable
          columns={["Cliente", "Data", "Status", "Local"]}
          rows={data.escorts.slice(0, 8).map((escort) => ({
            href: `/agendamentos/${escort.id}`,
            cells: [escort.clients?.nome ?? escort.client_id, escort.data_escolta, escort.status, escort.local_carregamento],
          }))}
        />
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <CreditCard className="text-amber-700" />
          <h2 className="mt-3 font-display text-xl font-bold">Pagamentos pendentes</h2>
          <strong className="mt-4 block text-4xl text-stone-950">{data.pendingPayments.length}</strong>
          <Link className="mt-4 inline-block font-bold text-stone-950 underline" href="/financeiro">Abrir financeiro</Link>
        </div>
      </section>
    </AppShell>
  );
}