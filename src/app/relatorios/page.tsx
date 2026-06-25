import { BarChart3, Coins, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { RecordTable } from "@/components/tables/record-table";
import { requireProfile } from "@/lib/auth";
import { getReports } from "@/services/reports";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ inicio?: string; fim?: string; status?: string }> }) {
  const profile = await requireProfile(["supervisor"]);
  const params = await searchParams;
  const data = await getReports(params);

  return (
    <AppShell profile={profile}>
      <h1 className="mb-6 font-display text-3xl font-bold">Relatórios</h1>
      <form className="mb-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input className="rounded-md border border-stone-300 px-3 py-3" name="inicio" type="date" />
        <input className="rounded-md border border-stone-300 px-3 py-3" name="fim" type="date" />
        <select className="rounded-md border border-stone-300 px-3 py-3" name="status">
          <option value="">Todos os status</option>
          <option>Agendada</option><option>Em andamento</option><option>Finalizada</option><option>Cancelada</option><option>Reagendada</option>
        </select>
        <button className="rounded-md bg-stone-950 px-4 py-3 font-bold text-white" type="submit">Filtrar</button>
      </form>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Escoltas no filtro" icon={BarChart3} label="Missões" value={data.escorts.length} />
        <StatCard detail="Receita bruta" icon={Coins} label="Faturamento" value={money(data.faturamento)} />
        <StatCard detail="Custos extras" icon={ReceiptText} label="Gastos" value={money(data.gastosExtras)} />
      </section>
      <div className="mt-6">
        <RecordTable columns={["Cliente", "Data", "Status", "Lucro estimado"]} rows={data.escorts.map((escort) => {
          const revenue = Number(escort.financial_clients?.[0]?.valor_total ?? 0);
          const expenses = (escort.extra_expenses ?? []).reduce((sum, item) => sum + Number(item.valor), 0);
          return { href: `/agendamentos/${escort.id}`, cells: [escort.clients?.nome ?? escort.client_id, escort.data_escolta, escort.status, money(revenue - expenses)] };
        })} />
      </div>
    </AppShell>
  );
}