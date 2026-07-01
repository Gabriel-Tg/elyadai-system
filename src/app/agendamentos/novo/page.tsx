import { AppShell } from "@/components/app-shell";
import { EscortForm } from "@/components/forms/escort-form";
import { requireProfile } from "@/lib/auth";
import { listClients } from "@/services/clients";
import { listEmployees } from "@/services/employees";

export const dynamic = "force-dynamic";

export default async function NewEscortPage() {
  const profile = await requireProfile(["supervisor"]);
  const [clients, employees] = await Promise.all([listClients(), listEmployees()]);

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Agendamento</p>
        <h1 className="font-display text-3xl font-bold">Nova escolta</h1>
      </div>
      <EscortForm clients={clients} employees={employees.filter((employee) => employee.status === "disponivel")} />
    </AppShell>
  );
}