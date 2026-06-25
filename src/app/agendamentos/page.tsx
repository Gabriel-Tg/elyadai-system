import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { listEscorts } from "@/services/escorts";

export const dynamic = "force-dynamic";

export default async function EscortsPage() {
  const profile = await requireProfile(["supervisor"]);
  const escorts = await listEscorts();

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Operação</p>
          <h1 className="font-display text-3xl font-bold">Agendamentos</h1>
        </div>
        <Link className="rounded-md bg-stone-950 px-4 py-3 text-sm font-bold text-white" href="/agendamentos/novo">Novo agendamento</Link>
      </div>
      <RecordTable columns={["Cliente", "Data", "Hora", "Status", "Equipe"]} rows={escorts.map((escort) => ({ href: `/agendamentos/${escort.id}`, cells: [escort.clients?.nome ?? escort.client_id, escort.data_escolta, escort.hora_carregamento, escort.status, escort.escort_team?.map((team) => team.employees?.nome).filter(Boolean).join(" + ") ?? "-"] }))} />
    </AppShell>
  );
}