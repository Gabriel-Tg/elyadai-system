import { AlertTriangle, Camera, MapPin, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { RecordTable } from "@/components/tables/record-table";
import { Panel } from "@/components/ui/panel";
import { requireProfile } from "@/lib/auth";
import { getEmployeeDashboard } from "@/services/dashboard";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const profile = await requireProfile(["funcionario"]);

  if (!profile.employee_id) {
    return (
      <AppShell profile={profile}>
        <Panel className="border-[var(--attention-yellow)] p-5 text-[#f0d18a] shadow-[var(--glow-yellow)]">
          <AlertTriangle />
          <h1 className="mt-3 font-display text-2xl font-bold">Cadastro de funcionário não vinculado</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6">
            Seu perfil de acesso existe, mas ainda não está associado a um cadastro de funcionário. Peça ao supervisor para vincular este usuário ao funcionário correspondente.
          </p>
        </Panel>
      </AppShell>
    );
  }

  const missions = await getEmployeeDashboard(profile.employee_id);
  const photoCount = missions.reduce(
    (sum, mission) => sum + ((mission as { escort_photos?: unknown[] }).escort_photos?.length ?? 0),
    0,
  );

  return (
    <AppShell profile={profile}>
      <h1 className="mb-6 font-display text-3xl font-bold">Minhas missões</h1>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Missões vinculadas ao seu usuário" icon={ShieldCheck} label="Total" tone="blue" value={missions.length} />
        <StatCard detail="Rastreamento em tempo real" icon={MapPin} label="Em andamento" tone="green" value={missions.filter((mission) => mission.status === "Em andamento").length} />
        <StatCard detail="Fotos anexadas por você" icon={Camera} label="Fotos" tone="yellow" value={photoCount} />
      </section>
      {missions.length ? (
        <section className="mt-6">
          <h2 className="mb-4 font-display text-2xl font-bold">Agendamentos</h2>
          <RecordTable columns={["Cliente", "Data", "Hora", "Status", "Local"]} rows={missions.map((mission) => ({ href: `/agendamentos/${mission.id}`, cells: [mission.clients?.nome ?? mission.client_id, mission.data_escolta, mission.hora_carregamento, mission.status, mission.local_carregamento] }))} />
        </section>
      ) : (
        <Panel className="mt-6 p-5 text-[var(--muted-strong)]">Nenhuma missão vinculada.</Panel>
      )}
    </AppShell>
  );
}