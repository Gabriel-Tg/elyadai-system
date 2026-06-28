import { createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import type { Escort, ExtraExpense, FinancialClient, FinancialEmployee } from "@/types/database";

export async function getReports(searchParams?: { inicio?: string; fim?: string; status?: string }) {
  if (shouldUseTemporarySupabaseFallback()) {
    return {
      escorts: [],
      faturamento: 0,
      pendencias: 0,
      gastosExtras: 0,
      employeePayments: [],
      expenses: [],
    };
  }

  const supabase = await createServerSupabaseClient();
  let escortsQuery = supabase.from("escorts").select("*, clients(id,nome), financial_clients(*), extra_expenses(*)").order("data_escolta", { ascending: false });

  if (searchParams?.inicio) {
    escortsQuery = escortsQuery.gte("data_escolta", searchParams.inicio);
  }

  if (searchParams?.fim) {
    escortsQuery = escortsQuery.lte("data_escolta", searchParams.fim);
  }

  if (searchParams?.status) {
    escortsQuery = escortsQuery.eq("status", searchParams.status);
  }

  const [{ data: escorts }, { data: employeePayments }, { data: expenses }] = await Promise.all([
    escortsQuery,
    supabase.from("financial_employees").select("*, employees(id,nome)"),
    supabase.from("extra_expenses").select("*"),
  ]);

  const escortRows = (escorts ?? []) as Escort[];
  const financialRows = escortRows.flatMap((escort) => escort.financial_clients ?? []) as FinancialClient[];
  const expenseRows = (expenses ?? []) as ExtraExpense[];

  return {
    escorts: escortRows,
    faturamento: financialRows.reduce((sum, item) => sum + Number(item.valor_total), 0),
    pendencias: financialRows.filter((item) => item.status_pagamento === "pendente").length,
    gastosExtras: expenseRows.reduce((sum, item) => sum + Number(item.valor), 0),
    employeePayments: (employeePayments ?? []) as FinancialEmployee[],
    expenses: expenseRows,
  };
}