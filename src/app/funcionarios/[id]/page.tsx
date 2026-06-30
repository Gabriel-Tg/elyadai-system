import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { getEmployeeDetails } from "@/services/employees";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile(["supervisor"]);
  const { id } = await params;
  const details = await getEmployeeDetails(id);

  if (!details) notFound();

  return (
    <AppShell profile={profile}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Funcionário</p>
      <h1 className="font-display text-3xl font-bold">{details.employee.nome}</h1>
      <dl className="mt-4 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <div><dt className="text-sm font-bold text-stone-500">CPF</dt><dd>{details.employee.cpf}</dd></div>
        <div><dt className="text-sm font-bold text-stone-500">Telefone</dt><dd>{details.employee.telefone}</dd></div>
        <div><dt className="text-sm font-bold text-stone-500">Status</dt><dd>{details.employee.status}</dd></div>
      </dl>
      <h2 className="mt-8 font-display text-2xl font-bold">Missões</h2>
      <div className="mt-4">
        <RecordTable columns={["Data", "Status", "Local"]} rows={details.missions.map((escort) => ({ href: `/agendamentos/${escort.id}`, cells: [escort.data_escolta, escort.status, escort.local_carregamento] }))} />
      </div>
    </AppShell>
  );
}