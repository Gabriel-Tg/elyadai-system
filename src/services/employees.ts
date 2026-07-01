"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import { initialPassword, required } from "@/validators/records";
import type { Employee, EmployeeStatus, Escort } from "@/types/database";

function employeeStatus(value: FormDataEntryValue | null): EmployeeStatus {
  const status = required(value, "Status");

  if (status === "disponivel" || status === "folga") {
    return status;
  }

  throw new Error("Status manual deve ser disponível ou folga.");
}

export async function listEmployees() {
  if (shouldUseTemporarySupabaseFallback()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("employees").select("*").order("nome");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Employee[];
}

export async function getEmployeeDetails(id: string) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Funcionário indisponível no modo supervisor temporário sem Supabase configurado.");
  }

  const supabase = createAdminSupabaseClient();
  const [{ data: employee, error: employeeError }, { data: missions, error: missionsError }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).maybeSingle(),
    supabase.from("escorts").select("*, escort_team!inner(employee_id)").eq("escort_team.employee_id", id).order("data_escolta", { ascending: false }),
  ]);

  if (employeeError || missionsError) {
    throw new Error(employeeError?.message ?? missionsError?.message);
  }

  if (!employee) {
    return null;
  }

  return {
    employee: employee as Employee,
    missions: (missions ?? []) as Escort[],
  };
}

export async function createEmployeeAction(formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Cadastros ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const nome = required(formData.get("nome"), "Nome");
  const cpf = required(formData.get("cpf"), "CPF");
  const telefone = required(formData.get("telefone"), "Telefone");
  const email = required(formData.get("email"), "Email de acesso");
  const password = initialPassword(formData.get("senha_inicial"));
  const admin = createAdminSupabaseClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, role: "funcionario" },
  });

  if (userError || !userData.user) {
    throw new Error(userError?.message ?? "Não foi possível criar usuário do funcionário.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({ user_id: userData.user.id, nome, email, role: "funcionario" })
    .select("*")
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Não foi possível criar perfil do funcionário.");
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({ nome, cpf, telefone, profile_id: profile.id })
    .select("*")
    .single();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "Não foi possível cadastrar funcionário.");
  }

  await admin.from("profiles").update({ employee_id: employee.id }).eq("id", profile.id);
  revalidatePath("/funcionarios");
  redirect(`/funcionarios/${employee.id}`);
}

export async function updateEmployeeStatusAction(formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Atualizações ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const employeeId = required(formData.get("employee_id"), "Funcionário");
  const status = employeeStatus(formData.get("status"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("employees").update({ status }).eq("id", employeeId).neq("status", "ocupado");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/funcionarios");
  revalidatePath(`/funcionarios/${employeeId}`);
  revalidatePath("/dashboard");
}