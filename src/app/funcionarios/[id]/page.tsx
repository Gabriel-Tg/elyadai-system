import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecordTable } from "@/components/tables/record-table";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth";
import { formatCpf, formatPhone } from "@/lib/formatters";
import { getEmployeeDetails } from "@/services/employees";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile(["supervisor"]);
  const { id } = await params;
  const details = await getEmployeeDetails(id);

  if (!details) notFound();

  return (
    <AppShell profile={profile}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Funcionário</p>
      <h1 className="font-display text-3xl font-bold">{details.employee.nome}</h1>
      <Panel className="mt-4 p-5">
        <dl className="grid gap-4 md:grid-cols-3">
          <div><dt className="text-sm font-bold text-[var(--muted)]">CPF</dt><dd>{formatCpf(details.employee.cpf)}</dd></div>
          <div><dt className="text-sm font-bold text-[var(--muted)]">Telefone</dt><dd>{formatPhone(details.employee.telefone)}</dd></div>
          <div><dt className="text-sm font-bold text-[var(--muted)]">Status</dt><dd className="mt-1"><StatusBadge value={details.employee.status} /></dd></div>
        </dl>
      </Panel>
      <h2 className="mt-8 font-display text-2xl font-bold">Missões</h2>
      <div className="mt-4">
        <RecordTable columns={["Data", "Status", "Local"]} rows={details.missions.map((escort) => ({ href: `/agendamentos/${escort.id}`, cells: [escort.data_escolta, escort.status, escort.local_carregamento] }))} />
      </div>
    </AppShell>
  );
}