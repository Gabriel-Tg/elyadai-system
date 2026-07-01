import { CalendarClock, CheckCircle2, CreditCard, MapPin, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { RecordTable } from "@/components/tables/record-table";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Supervisor</p>
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">Dashboard principal</h1>
        </div>
        <ButtonLink href="/agendamentos/novo">Nova escolta</ButtonLink>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard detail="Funcionários aptos para escala" icon={UsersRound} iconHref="/funcionarios?status=disponivel" iconLabel="Ver funcionários disponíveis" label="Disponíveis" tone="green" value={data.availableEmployees} />
        <StatCard detail="Funcionários em missão" icon={MapPin} iconHref="/agendamentos?status=Em%20andamento" iconLabel="Ver missões atuais" label="Em missão" tone="blue" value={data.busyEmployees} />
        <StatCard detail="Agendamentos do dia" icon={CalendarClock} iconHref="/agendamentos?periodo=hoje" iconLabel="Ver agendamentos de hoje" label="Hoje" tone="yellow" value={data.todayMissions} />
        <StatCard detail="Rastreamento ativo" icon={MapPin} iconHref="/agendamentos?status=Em%20andamento" iconLabel="Ver agendamentos em andamento" label="Andamento" tone="blue" value={data.inProgressMissions} />
        <StatCard detail="Fechadas operacionalmente" icon={CheckCircle2} iconHref="/agendamentos?status=Finalizada" iconLabel="Ver histórico de agendamentos concluídos" label="Finalizadas" tone="green" value={data.finishedMissions} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <RecordTable
          columns={["Cliente", "Data", "Status", "Local"]}
          rows={data.escorts.slice(0, 8).map((escort) => ({
            href: `/agendamentos/${escort.id}`,
            cells: [escort.clients?.nome ?? escort.client_id, escort.data_escolta, escort.status, escort.local_carregamento],
          }))}
        />
        <Panel className="p-5">
          <CreditCard className="text-[#f0d18a]" />
          <h2 className="mt-3 font-display text-xl font-bold">Pagamentos pendentes</h2>
          <strong className="mt-4 block text-4xl text-[var(--foreground)]">{data.pendingPayments.length}</strong>
          <ButtonLink className="mt-4" href="/financeiro" variant="warning">Abrir financeiro</ButtonLink>
        </Panel>
      </section>
    </AppShell>
  );
}