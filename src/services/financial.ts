"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import { optional, required } from "@/validators/records";
import type { ExtraExpense, FinancialClient, FinancialEmployee, FinancialEntry, FinancialEntryCategory, FinancialEntryDirection, FinancialEscortOption } from "@/types/database";

function amountFromForm(value: FormDataEntryValue | null) {
  const amount = Number(required(value, "Valor"));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  return amount;
}

function dateFromForm(value: FormDataEntryValue | null, field: string) {
  const date = required(value, field);

  if (Number.isNaN(new Date(`${date}T12:00:00`).getTime())) {
    throw new Error(`${field} inválida.`);
  }

  return date;
}

function financialEntryDirection(value: FormDataEntryValue | null): FinancialEntryDirection {
  const direction = required(value, "Tipo do lançamento");

  if (direction === "payable" || direction === "receivable") {
    return direction;
  }

  throw new Error("Tipo de lançamento inválido.");
}

function financialEntryCategory(value: FormDataEntryValue | null): FinancialEntryCategory {
  const category = required(value, "Categoria");

  if (["combustivel", "pedagio", "alimentacao_extra", "outros", "cliente", "funcionario", "ajuste"].includes(category)) {
    return category as FinancialEntryCategory;
  }

  throw new Error("Categoria inválida.");
}

export async function getFinancialOverview() {
  if (shouldUseTemporarySupabaseFallback()) {
    return {
      clients: [],
      employees: [],
      expenses: [],
      entries: [],
      escorts: [],
    };
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: clients }, { data: employees }, { data: expenses }, { data: entries }, { data: escorts }] = await Promise.all([
    supabase.from("financial_clients").select("*, escorts(id, clients(nome))").order("created_at", { ascending: false }),
    supabase.from("financial_employees").select("*, employees(id,nome), escorts(id, data_escolta)").order("created_at", { ascending: false }),
    supabase.from("extra_expenses").select("*").order("created_at", { ascending: false }),
    supabase.from("financial_entries").select("*, escorts(id, data_escolta, local_carregamento, clients(nome))").order("entry_date", { ascending: false }),
    supabase.from("escorts").select("id, data_escolta, local_carregamento, clients(nome)").order("data_escolta", { ascending: false }),
  ]);

  return {
    clients: (clients ?? []) as FinancialClient[],
    employees: (employees ?? []) as FinancialEmployee[],
    expenses: (expenses ?? []) as ExtraExpense[],
    entries: (entries ?? []) as FinancialEntry[],
    escorts: (escorts ?? []) as unknown as FinancialEscortOption[],
  };
}

export async function createFinancialEntryAction(formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Lançamentos financeiros ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const profile = await requireProfile(["supervisor"]);
  const supabase = await createServerSupabaseClient();
  const entry = {
    direction: financialEntryDirection(formData.get("direction")),
    category: financialEntryCategory(formData.get("category")),
    escort_id: optional(formData.get("escort_id")),
    entry_date: dateFromForm(formData.get("entry_date"), "Data do lançamento"),
    amount: amountFromForm(formData.get("amount")),
    description: required(formData.get("description"), "Descrição"),
    created_by: profile.id,
  };

  const { error } = await supabase.from("financial_entries").insert(entry);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/financeiro");
}

export async function settlePayableAction(formData: FormData) {
  await settleFinancialTarget(formData, "payable");
}

export async function settleReceivableAction(formData: FormData) {
  await settleFinancialTarget(formData, "receivable");
}

async function settleFinancialTarget(formData: FormData, direction: FinancialEntryDirection) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Baixas financeiras ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  await requireProfile(["supervisor"]);
  const supabase = await createServerSupabaseClient();
  const target = required(formData.get("target"), direction === "payable" ? "Conta a pagar" : "Conta a receber");
  const paymentDate = dateFromForm(formData.get("payment_date"), direction === "payable" ? "Data de pagamento" : "Data de recebimento");
  const [targetType, targetId] = target.split(":");

  if (!targetType || !targetId) {
    throw new Error("Selecione uma conta válida para baixa.");
  }

  if (targetType === "entry") {
    const { error } = await supabase
      .from("financial_entries")
      .update({ status_pagamento: "pago", payment_date: paymentDate })
      .eq("id", targetId)
      .eq("direction", direction)
      .eq("status_pagamento", "pendente");

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/financeiro");
    return;
  }

  const paidAt = new Date(`${paymentDate}T12:00:00`).toISOString();
  const table = direction === "payable" ? "financial_employees" : "financial_clients";
  const expectedType = direction === "payable" ? "employee" : "client";

  if (targetType !== expectedType) {
    throw new Error("Tipo de baixa incompatível com a conta selecionada.");
  }

  const { error } = await supabase
    .from(table)
    .update({ status_pagamento: "pago", paid_at: paidAt })
    .eq("id", targetId)
    .eq("status_pagamento", "pendente");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/financeiro");
}