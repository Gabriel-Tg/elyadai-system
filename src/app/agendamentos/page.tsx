import { AppShell } from "@/components/app-shell";
import { RecordTable } from "@/components/tables/record-table";
import { ButtonLink } from "@/components/ui/button";
import { FilterChip, FilterChips } from "@/components/ui/filter-chips";
import { requireProfile } from "@/lib/auth";
import { listEscorts } from "@/services/escorts";
import type { EscortStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const ESCORT_STATUS_LABELS: Record<EscortStatus, string> = {
  Agendada: "Agendamentos agendados",
  "Em andamento": "Missões atuais",
  Finalizada: "Histórico de agendamentos concluídos",
  Cancelada: "Agendamentos cancelados",
  Reagendada: "Agendamentos reagendados",
};

type EscortsPageProps = {
  searchParams: Promise<{ periodo?: string | string[]; status?: string | string[] }>;
};

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function escortStatusFromParam(status: string | string[] | undefined) {
  const value = firstParamValue(status);

  if (value === "Agendada" || value === "Em andamento" || value === "Finalizada" || value === "Cancelada" || value === "Reagendada") {
    return value;
  }

  return undefined;
}

function isTodayPeriod(periodo: string | string[] | undefined) {
  return firstParamValue(periodo) === "hoje";
}

function todayDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function EscortsPage({ searchParams }: EscortsPageProps) {
  const profile = await requireProfile(["supervisor"]);
  const params = await searchParams;
  const status = escortStatusFromParam(params.status);
  const onlyToday = isTodayPeriod(params.periodo);
  const escorts = await listEscorts();
  const visibleEscorts = escorts.filter((escort) => {
    if (status && escort.status !== status) {
      return false;
    }

    if (onlyToday && escort.data_escolta !== todayDateKey()) {
      return false;
    }

    return true;
  });
  const title = onlyToday ? "Agendamentos de hoje" : status ? ESCORT_STATUS_LABELS[status] : "Agendamentos";

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Operação</p>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
        </div>
        <ButtonLink href="/agendamentos/novo">Novo agendamento</ButtonLink>
      </div>
      <FilterChips>
        <FilterChip active={!status && !onlyToday} href="/agendamentos">Todos</FilterChip>
        <FilterChip active={onlyToday} href="/agendamentos?periodo=hoje">Hoje</FilterChip>
        <FilterChip active={status === "Agendada"} href="/agendamentos?status=Agendada">Agendada</FilterChip>
        <FilterChip active={status === "Em andamento"} href="/agendamentos?status=Em%20andamento">Em andamento</FilterChip>
        <FilterChip active={status === "Reagendada"} href="/agendamentos?status=Reagendada">Reagendada</FilterChip>
        <FilterChip active={status === "Finalizada"} href="/agendamentos?status=Finalizada">Finalizada</FilterChip>
        <FilterChip active={status === "Cancelada"} href="/agendamentos?status=Cancelada">Cancelada</FilterChip>
      </FilterChips>
      <RecordTable columns={["Cliente", "Data", "Hora", "Status", "Equipe"]} rows={visibleEscorts.map((escort) => ({ href: `/agendamentos/${escort.id}`, cells: [escort.clients?.nome ?? escort.client_id, escort.data_escolta, escort.hora_carregamento, escort.status, escort.escort_team?.map((team) => team.employees?.nome).filter(Boolean).join(" + ") ?? "-"] }))} />
    </AppShell>
  );
}