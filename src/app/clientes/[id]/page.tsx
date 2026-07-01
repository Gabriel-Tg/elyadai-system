import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecordTable } from "@/components/tables/record-table";
import { Panel } from "@/components/ui/panel";
import { requireProfile } from "@/lib/auth";
import { formatCnpj, formatPhone } from "@/lib/formatters";
import { getClientDetails } from "@/services/clients";

export const dynamic = "force-dynamic";

export default async function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile(["supervisor"]);
  const { id } = await params;
  const details = await getClientDetails(id);

  if (!details) notFound();

  return (
    <AppShell profile={profile}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Cliente</p>
      <h1 className="font-display text-3xl font-bold">{details.client.nome}</h1>
      <Panel className="mt-4 p-5">
        <dl className="grid gap-4 md:grid-cols-3">
          <div><dt className="text-sm font-bold text-[var(--muted)]">CNPJ</dt><dd>{formatCnpj(details.client.cnpj)}</dd></div>
          <div><dt className="text-sm font-bold text-[var(--muted)]">Telefone</dt><dd>{formatPhone(details.client.telefone)}</dd></div>
          <div><dt className="text-sm font-bold text-[var(--muted)]">Email</dt><dd>{details.client.email}</dd></div>
        </dl>
      </Panel>
      <h2 className="mt-8 font-display text-2xl font-bold">Escoltas do cliente</h2>
      <div className="mt-4">
        <RecordTable columns={["Data", "Status", "Local", "Pagamento"]} rows={details.escorts.map((escort) => ({ href: `/agendamentos/${escort.id}`, cells: [escort.data_escolta, escort.status, escort.local_carregamento, escort.financial_clients?.[0]?.status_pagamento ?? "-"] }))} />
      </div>
    </AppShell>
  );
}