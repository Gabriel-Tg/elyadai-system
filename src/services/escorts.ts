"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { optional, required } from "@/validators/records";
import type { Escort, EscortLocation, EscortPhoto, EscortStatus, Profile } from "@/types/database";

export async function listEscorts() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("escorts")
    .select("*, clients(id,nome,cnpj,telefone,email), escort_team(*, employees(id,nome,telefone,status)), financial_clients(*), extra_expenses(*)")
    .order("data_escolta", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Escort[];
}

export async function getEscortDetails(id: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: escort, error: escortError }, { data: locations, error: locationsError }, { data: photos, error: photosError }] = await Promise.all([
    supabase
      .from("escorts")
      .select("*, clients(id,nome,cnpj,telefone,email), escort_team(*, employees(id,nome,telefone,status)), financial_clients(*), financial_employees(*, employees(id,nome)), extra_expenses(*)")
      .eq("id", id)
      .single(),
    supabase.from("escort_locations").select("*").eq("escort_id", id).order("recorded_at"),
    supabase.from("escort_photos").select("*").eq("escort_id", id).order("taken_at", { ascending: false }),
  ]);

  if (escortError || locationsError || photosError) {
    throw new Error(escortError?.message ?? locationsError?.message ?? photosError?.message);
  }

  return {
    escort: escort as Escort,
    locations: (locations ?? []) as EscortLocation[],
    photos: (photos ?? []) as EscortPhoto[],
  };
}

export async function createEscortAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const clientId = required(formData.get("client_id"), "Cliente");
  const employeeOneId = required(formData.get("employee_1"), "Funcionário 1");
  const employeeTwoId = required(formData.get("employee_2"), "Funcionário 2");

  if (employeeOneId === employeeTwoId) {
    throw new Error("A escolta deve possuir exatamente 2 funcionários distintos.");
  }

  const { data, error } = await supabase.rpc("create_escort_with_team", {
    p_client_id: clientId,
    p_data_escolta: required(formData.get("data_escolta"), "Data da escolta"),
    p_hora_carregamento: required(formData.get("hora_carregamento"), "Hora do carregamento"),
    p_local_carregamento: required(formData.get("local_carregamento"), "Local do carregamento"),
    p_observacao_operacional: optional(formData.get("observacao_operacional")),
    p_encontro_alternativo_permitido: formData.get("encontro_alternativo_permitido") === "on",
    p_local_alternativo_encontro: optional(formData.get("local_alternativo_encontro")),
    p_employee_1: employeeOneId,
    p_employee_2: employeeTwoId,
    p_valor_base: Number(required(formData.get("valor_base"), "Valor base")),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/agendamentos");
  redirect(`/agendamentos/${data}`);
}

export async function updateEscortStatusAction(escortId: string, status: EscortStatus) {
  const supabase = await createServerSupabaseClient();
  const patch = status === "Em andamento" ? { status, inicio_real: new Date().toISOString() } : status === "Finalizada" ? { status, fim_real: new Date().toISOString() } : { status };
  const { error } = await supabase.from("escorts").update(patch).eq("id", escortId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/agendamentos/${escortId}`);
}

export async function sendLocationAction(profile: Profile, formData: FormData) {
  if (!profile.employee_id) {
    throw new Error("Perfil de funcionário obrigatório para enviar localização.");
  }

  const supabase = await createServerSupabaseClient();
  const escortId = required(formData.get("escort_id"), "Escolta");
  const { error } = await supabase.from("escort_locations").insert({
    escort_id: escortId,
    employee_id: profile.employee_id,
    latitude: Number(required(formData.get("latitude"), "Latitude")),
    longitude: Number(required(formData.get("longitude"), "Longitude")),
    accuracy_meters: Number(optional(formData.get("accuracy_meters")) ?? 0),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/funcionario/dashboard");
}

export async function uploadEscortPhotoAction(profile: Profile, formData: FormData) {
  if (!profile.employee_id) {
    throw new Error("Perfil de funcionário obrigatório para anexar fotos.");
  }

  const file = formData.get("foto");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione uma foto.");
  }

  const escortId = required(formData.get("escort_id"), "Escolta");
  const admin = createAdminSupabaseClient();
  const storagePath = `${escortId}/${profile.employee_id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await admin.storage.from("escort-photos").upload(storagePath, file, { upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = admin.storage.from("escort-photos").getPublicUrl(storagePath);
  const { error } = await admin.from("escort_photos").insert({
    escort_id: escortId,
    employee_id: profile.employee_id,
    storage_path: storagePath,
    url: data.publicUrl,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/funcionario/dashboard");
}