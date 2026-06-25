"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getHomeForRole } from "@/lib/permissions";
import { required } from "@/validators/records";
import type { Profile } from "@/types/database";

export async function signInAction(formData: FormData) {
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

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}