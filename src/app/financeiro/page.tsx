import { CreditCard, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { getFinancialOverview } from "@/services/financial";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default async function FinancialPage() {
  const profile = await requireProfile(["supervisor"]);
  const data = await getFinancialOverview();
  const clientTotal = data.clients.reduce((sum, item) => sum + Number(item.valor_total), 0);
  const employeeTotal = data.employees.reduce((sum, item) => sum + Number(item.pagamento_final), 0);

  return (
    <AppShell profile={profile}>
      <h1 className="mb-6 font-display text-3xl font-bold">Financeiro</h1>
      <section className="grid gap-4 md:grid-cols-2">
        <StatCard detail="Faturamento bruto de clientes" icon={CreditCard} label="Clientes" value={money(clientTotal)} />
        <StatCard detail="Pagamentos finais de funcionários" icon={WalletCards} label="Funcionários" value={money(employeeTotal)} />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecordTable columns={["Escolta", "Total", "Status"]} rows={data.clients.map((item) => ({ cells: [item.escort_id, money(item.valor_total), item.status_pagamento] }))} />
        <RecordTable columns={["Funcionário", "Escolta", "Final", "Status"]} rows={data.employees.map((item) => ({ cells: [item.employees?.nome ?? item.employee_id, item.escort_id, money(item.pagamento_final), item.status_pagamento] }))} />
      </div>
    </AppShell>
  );
}