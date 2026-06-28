import { createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import type { ExtraExpense, FinancialClient, FinancialEmployee } from "@/types/database";

export async function getFinancialOverview() {
  if (shouldUseTemporarySupabaseFallback()) {
    return {
      clients: [],
      employees: [],
      expenses: [],
    };
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: clients }, { data: employees }, { data: expenses }] = await Promise.all([
    supabase.from("financial_clients").select("*, escorts(id, clients(nome))").order("created_at", { ascending: false }),
    supabase.from("financial_employees").select("*, employees(id,nome)").order("created_at", { ascending: false }),
    supabase.from("extra_expenses").select("*").order("created_at", { ascending: false }),
  ]);

  return {
    clients: (clients ?? []) as FinancialClient[],
    employees: (employees ?? []) as FinancialEmployee[],
    expenses: (expenses ?? []) as ExtraExpense[],
  };
}