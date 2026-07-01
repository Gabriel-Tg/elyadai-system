import { ArrowDownToLine, ArrowUpFromLine, CreditCard, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { FinancialModals } from "@/components/finance/financial-modals";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { getFinancialOverview } from "@/services/financial";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

export default async function FinancialPage() {
  const profile = await requireProfile(["supervisor"]);
  const data = await getFinancialOverview();
  const clientTotal = data.clients.reduce((sum, item) => sum + Number(item.valor_total), 0);
  const employeeTotal = data.employees.reduce((sum, item) => sum + Number(item.pagamento_final), 0);
  const entryReceivables = data.entries.filter((entry) => entry.direction === "receivable");
  const entryPayables = data.entries.filter((entry) => entry.direction === "payable");
  const paidClientTotal = data.clients.filter((item) => item.status_pagamento === "pago").reduce((sum, item) => sum + Number(item.valor_total), 0);
  const paidEmployeeTotal = data.employees.filter((item) => item.status_pagamento === "pago").reduce((sum, item) => sum + Number(item.pagamento_final), 0);
  const paidEntryReceivables = entryReceivables.filter((entry) => entry.status_pagamento === "pago").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const paidEntryPayables = entryPayables.filter((entry) => entry.status_pagamento === "pago").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const cashIn = paidClientTotal + paidEntryReceivables;
  const cashOut = paidEmployeeTotal + paidEntryPayables;
  const pendingPayableOptions = [
    ...data.employees.filter((item) => item.status_pagamento === "pendente").map((item) => ({ label: `${item.employees?.nome ?? item.employee_id} - ${money(item.pagamento_final)}`, value: `employee:${item.id}` })),
    ...entryPayables.filter((entry) => entry.status_pagamento === "pendente").map((entry) => ({ label: `${entry.description} - ${money(entry.amount)}`, value: `entry:${entry.id}` })),
  ];
  const pendingReceivableOptions = [
    ...data.clients.filter((item) => item.status_pagamento === "pendente").map((item) => ({ label: `${item.escorts?.clients?.nome ?? item.escort_id} - ${money(item.valor_total)}`, value: `client:${item.id}` })),
    ...entryReceivables.filter((entry) => entry.status_pagamento === "pendente").map((entry) => ({ label: `${entry.description} - ${money(entry.amount)}`, value: `entry:${entry.id}` })),
  ];
  const escortOptions = data.escorts.map((escort) => ({
    label: `${date(escort.data_escolta)} - ${escort.clients?.nome ?? escort.local_carregamento}`,
    value: escort.id,
  }));
  const cashFlowRows = [
    ...data.clients.filter((item) => item.status_pagamento === "pago").map((item) => ({ paidAt: item.paid_at, cells: [date(item.paid_at), "Entrada", item.escorts?.clients?.nome ?? item.escort_id, "Recebimento de cliente", money(item.valor_total)] })),
    ...data.employees.filter((item) => item.status_pagamento === "pago").map((item) => ({ paidAt: item.paid_at, cells: [date(item.paid_at), "Saída", item.employees?.nome ?? item.employee_id, "Pagamento de funcionário", money(Number(item.pagamento_final) * -1)] })),
    ...data.entries.filter((entry) => entry.status_pagamento === "pago").map((entry) => ({ paidAt: entry.payment_date, cells: [date(entry.payment_date), entry.direction === "receivable" ? "Entrada" : "Saída", entry.escorts?.clients?.nome ?? entry.category, entry.description, money(Number(entry.amount) * (entry.direction === "receivable" ? 1 : -1))] })),
  ].sort((first, second) => String(second.paidAt ?? "").localeCompare(String(first.paidAt ?? "")));

  return (
    <AppShell profile={profile}>
      <h1 className="mb-6 font-display text-3xl font-bold">Financeiro</h1>
      <FinancialModals escortOptions={escortOptions} payableOptions={pendingPayableOptions} receivableOptions={pendingReceivableOptions} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard detail="Faturamento bruto de clientes" icon={CreditCard} label="Clientes" tone="green" value={money(clientTotal)} />
        <StatCard detail="Pagamentos finais de funcionários" icon={WalletCards} label="Funcionários" tone="yellow" value={money(employeeTotal)} />
        <StatCard detail="Recebimentos quitados" icon={ArrowDownToLine} label="Entradas" tone="green" value={money(cashIn)} />
        <StatCard detail="Pagamentos quitados" icon={ArrowUpFromLine} label="Saídas" tone="red" value={money(cashOut)} />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecordTable columns={["Cliente", "Escolta", "Total", "Status"]} rows={data.clients.map((item) => ({ cells: [item.escorts?.clients?.nome ?? item.escort_id, item.escort_id, money(item.valor_total), item.status_pagamento] }))} />
        <RecordTable columns={["Funcionário", "Escolta", "Final", "Status"]} rows={data.employees.map((item) => ({ cells: [item.employees?.nome ?? item.employee_id, item.escort_id, money(item.pagamento_final), item.status_pagamento] }))} />
      </div>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-4 font-display text-2xl font-bold">Contas a pagar</h2>
          <RecordTable columns={["Origem", "Corrida", "Vencimento", "Valor", "Status"]} rows={[
            ...data.employees.map((item) => ({ cells: [item.employees?.nome ?? item.employee_id, item.escort_id, date(item.created_at), money(item.pagamento_final), item.status_pagamento] })),
            ...entryPayables.map((entry) => ({ cells: [entry.description, entry.escort_id ?? "Avulso", date(entry.entry_date), money(entry.amount), entry.status_pagamento] })),
          ]} />
        </div>
        <div>
          <h2 className="mb-4 font-display text-2xl font-bold">Contas a receber</h2>
          <RecordTable columns={["Origem", "Corrida", "Vencimento", "Valor", "Status"]} rows={[
            ...data.clients.map((item) => ({ cells: [item.escorts?.clients?.nome ?? item.escort_id, item.escort_id, date(item.created_at), money(item.valor_total), item.status_pagamento] })),
            ...entryReceivables.map((entry) => ({ cells: [entry.description, entry.escort_id ?? "Avulso", date(entry.entry_date), money(entry.amount), entry.status_pagamento] })),
          ]} />
        </div>
      </section>
      <div className="mt-6">
        <h2 className="mb-4 font-display text-2xl font-bold">Fluxo de caixa</h2>
        <RecordTable columns={["Data", "Tipo", "Origem", "Descrição", "Valor"]} rows={cashFlowRows.map((row) => ({ cells: row.cells }))} />
      </div>
    </AppShell>
  );
}