"use server";

import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { getHomeForRole } from "@/lib/permissions";
import { temporarySupervisorMode } from "@/lib/temporary-supervisor-mode";
import { initialPassword, required } from "@/validators/records";
import type { Profile } from "@/types/database";

function authErrorStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return null;
}

function supervisorSignupError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status = authErrorStatus(error);

  if (status === 401 || message.includes("jwt") || message.includes("invalid api key")) {
    return "service-role-invalida";
  }

  if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
    return "email-ja-cadastrado";
  }

  return "cadastro-supervisor";
}

export async function signInAction(formData: FormData) {
  if (temporarySupervisorMode) {
    redirect("/dashboard");
  }

  const email = required(formData.get("email"), "Email");
  const password = required(formData.get("password"), "Senha");
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/login?error=credenciais-invalidas");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=perfil-nao-encontrado");
  }

  redirect(getHomeForRole((profile as Profile).role));
}

export async function signUpSupervisorAction(formData: FormData) {
  if (temporarySupervisorMode) {
    redirect("/dashboard");
  }

  const nome = required(formData.get("nome"), "Nome");
  const email = required(formData.get("email"), "Email");
  const password = initialPassword(formData.get("password"));
  const admin = createAdminSupabaseClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, role: "supervisor" },
  });

  if (userError || !userData.user) {
    redirect(`/login?error=${supervisorSignupError(userError)}`);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: userData.user.id,
    nome,
    email,
    role: "supervisor",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userData.user.id);
    redirect("/login?error=cadastro-supervisor");
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    redirect("/login?error=cadastro-login");
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  if (temporarySupervisorMode) {
    redirect("/dashboard");
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}