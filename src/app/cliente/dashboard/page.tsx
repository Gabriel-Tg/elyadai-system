import { CreditCard, MapPin, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { getClientDashboard } from "@/services/dashboard";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default async function ClientDashboardPage() {
  const profile = await requireProfile(["cliente"]);

  if (!profile.client_id) {
    throw new Error("Perfil de cliente sem vínculo com cadastro de cliente.");
  }

  const escorts = await getClientDashboard(profile.client_id);
  const pending = escorts.filter((escort) => escort.financial_clients?.[0]?.status_pagamento === "pendente");
  const total = escorts.reduce((sum, escort) => sum + Number(escort.financial_clients?.[0]?.valor_total ?? 0), 0);

  return (
    <AppShell profile={profile}>
      <h1 className="mb-6 font-display text-3xl font-bold">Meu painel</h1>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Escoltas vinculadas ao seu CNPJ" icon={ShieldCheck} label="Missões" value={escorts.length} />
        <StatCard detail="Missões com status Em andamento" icon={MapPin} label="Ao vivo" value={escorts.filter((escort) => escort.status === "Em andamento").length} />
        <StatCard detail="Total faturado no portal" icon={CreditCard} label="Pagamentos" value={money(total)} />
      </section>
      <div className="mt-6">
        <RecordTable columns={["Data", "Status", "Local", "Pagamento"]} rows={escorts.map((escort) => ({ href: `/agendamentos/${escort.id}`, cells: [escort.data_escolta, escort.status, escort.local_carregamento, escort.financial_clients?.[0]?.status_pagamento ?? "-"] }))} />
      </div>
      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">Pendências</h2>
        <p className="mt-2 text-stone-700">{pending.length} pagamento(s) pendente(s) para acompanhamento.</p>
      </div>
    </AppShell>
  );
}