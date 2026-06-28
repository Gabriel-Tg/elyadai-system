"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import { initialPassword, optional, required } from "@/validators/records";
import type { Client, Escort, FinancialClient } from "@/types/database";

export async function listClients() {
  if (shouldUseTemporarySupabaseFallback()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("clients").select("*").order("nome");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Client[];
}

export async function getClientDetails(id: string) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Cliente indisponível no modo supervisor temporário sem Supabase configurado.");
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: client, error: clientError }, { data: escorts, error: escortsError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("escorts").select("*, financial_clients(*)").eq("client_id", id).order("data_escolta", { ascending: false }),
    supabase.from("financial_clients").select("*, escorts!inner(client_id)").eq("escorts.client_id", id),
  ]);

  if (clientError || escortsError || paymentsError) {
    throw new Error(clientError?.message ?? escortsError?.message ?? paymentsError?.message);
  }

  return {
    client: client as Client,
    escorts: (escorts ?? []) as Escort[],
    payments: (payments ?? []) as FinancialClient[],
  };
}

export async function createClientAction(formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Cadastros ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const nome = required(formData.get("nome"), "Nome");
  const cnpj = required(formData.get("cnpj"), "CNPJ");
  const telefone = required(formData.get("telefone"), "Telefone");
  const email = required(formData.get("email"), "Email de acesso");
  const password = initialPassword(formData.get("senha_inicial"));
  const admin = createAdminSupabaseClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, role: "cliente" },
  });

  if (userError || !userData.user) {
    throw new Error(userError?.message ?? "Não foi possível criar usuário do cliente.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({ user_id: userData.user.id, nome, email, role: "cliente" })
    .select("*")
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Não foi possível criar perfil do cliente.");
  }

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ nome, cnpj, telefone, email: optional(formData.get("email")) ?? email, profile_id: profile.id })
    .select("*")
    .single();

  if (clientError || !client) {
    throw new Error(clientError?.message ?? "Não foi possível cadastrar cliente.");
  }

  await admin.from("profiles").update({ client_id: client.id }).eq("id", profile.id);
  revalidatePath("/clientes");
  redirect(`/clientes/${client.id}`);
}