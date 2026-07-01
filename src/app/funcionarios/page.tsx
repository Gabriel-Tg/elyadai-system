import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/forms/employee-form";
import { EmployeeStatusForm } from "@/components/forms/employee-status-form";
import { RecordTable } from "@/components/tables/record-table";
import { FilterChip, FilterChips } from "@/components/ui/filter-chips";
import { requireProfile } from "@/lib/auth";
import { formatCpf, formatPhone } from "@/lib/formatters";
import { listEmployees } from "@/services/employees";
import type { EmployeeStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  disponivel: "Funcionários disponíveis",
  ocupado: "Funcionários em missão",
  folga: "Funcionários em folga",
};

type EmployeesPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

function employeeStatusFromParam(status: string | string[] | undefined) {
  const value = Array.isArray(status) ? status[0] : status;

  if (value === "disponivel" || value === "ocupado" || value === "folga") {
    return value;
  }

  return undefined;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const profile = await requireProfile(["supervisor"]);
  const status = employeeStatusFromParam((await searchParams).status);
  const employees = await listEmployees();
  const visibleEmployees = status ? employees.filter((employee) => employee.status === status) : employees;

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Equipe</p>
        <h1 className="font-display text-3xl font-bold">{status ? EMPLOYEE_STATUS_LABELS[status] : "Funcionários"}</h1>
      </div>
      <FilterChips label="Status da equipe">
        <FilterChip active={!status} href="/funcionarios">Todos</FilterChip>
        <FilterChip active={status === "disponivel"} href="/funcionarios?status=disponivel">Disponível</FilterChip>
        <FilterChip active={status === "ocupado"} href="/funcionarios?status=ocupado">Em missão</FilterChip>
        <FilterChip active={status === "folga"} href="/funcionarios?status=folga">Folga</FilterChip>
      </FilterChips>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <EmployeeForm />
        <RecordTable columns={["Nome", "CPF", "Telefone", "Status"]} rows={visibleEmployees.map((employee) => ({ href: `/funcionarios/${employee.id}`, cells: [employee.nome, formatCpf(employee.cpf), formatPhone(employee.telefone), <EmployeeStatusForm employeeId={employee.id} key={employee.id} status={employee.status} />] }))} />
      </div>
    </AppShell>
  );
}