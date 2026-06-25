import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/forms/employee-form";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { listEmployees } from "@/services/employees";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const profile = await requireProfile(["supervisor"]);
  const employees = await listEmployees();

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Equipe</p>
        <h1 className="font-display text-3xl font-bold">Funcionários</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <EmployeeForm />
        <RecordTable columns={["Nome", "CPF", "Telefone", "Status"]} rows={employees.map((employee) => ({ href: `/funcionarios/${employee.id}`, cells: [employee.nome, employee.cpf, employee.telefone, employee.status] }))} />
      </div>
    </AppShell>
  );
}