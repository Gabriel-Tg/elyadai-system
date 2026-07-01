import { AppShell } from "@/components/app-shell";
import { ClientForm } from "@/components/forms/client-form";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { formatCnpj, formatPhone } from "@/lib/formatters";
import { listClients } from "@/services/clients";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const profile = await requireProfile(["supervisor"]);
  const clients = await listClients();

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Cadastro</p>
        <h1 className="font-display text-3xl font-bold">Clientes</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ClientForm />
        <RecordTable columns={["Nome", "CNPJ", "Telefone", "Email"]} rows={clients.map((client) => ({ href: `/clientes/${client.id}`, cells: [client.nome, formatCnpj(client.cnpj), formatPhone(client.telefone), client.email] }))} />
      </div>
    </AppShell>
  );
}