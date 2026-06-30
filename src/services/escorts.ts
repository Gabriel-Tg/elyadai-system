"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import { optional, required } from "@/validators/records";
import type { Escort, EscortLocation, EscortPhoto, EscortStatus, Profile } from "@/types/database";

function scheduledEnd(dataEscolta: string, horaCarregamento: string) {
  const start = new Date(`${dataEscolta}T${horaCarregamento}`);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Data ou hora da escolta inválida.");
  }

  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

async function ensureEmployeeAssigned(escortId: string, employeeId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("escort_team")
    .select("id")
    .eq("escort_id", escortId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Funcionário não vinculado a esta escolta.");
  }
}

async function ensureClientOwnsEscort(escortId: string, clientId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("escorts")
    .select("id")
    .eq("id", escortId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Cliente não vinculado a esta escolta.");
  }
}

export async function listEscorts() {
  if (shouldUseTemporarySupabaseFallback()) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
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
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Escolta indisponível no modo supervisor temporário sem Supabase configurado.");
  }

  const supabase = createAdminSupabaseClient();
  const [{ data: escort, error: escortError }, { data: locations, error: locationsError }, { data: photos, error: photosError }] = await Promise.all([
    supabase
      .from("escorts")
      .select("*, clients(id,nome,cnpj,telefone,email), escort_team(*, employees(id,nome,telefone,status)), financial_clients(*), financial_employees(*, employees(id,nome)), extra_expenses(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("escort_locations").select("*").eq("escort_id", id).order("recorded_at"),
    supabase.from("escort_photos").select("*").eq("escort_id", id).order("taken_at", { ascending: false }),
  ]);

  if (escortError || locationsError || photosError) {
    throw new Error(escortError?.message ?? locationsError?.message ?? photosError?.message);
  }

  if (!escort) {
    return null;
  }

  return {
    escort: escort as Escort,
    locations: (locations ?? []) as EscortLocation[],
    photos: (photos ?? []) as EscortPhoto[],
  };
}

export async function createEscortAction(formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Agendamentos ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const profile = await requireProfile(["supervisor"]);
  const admin = createAdminSupabaseClient();
  const clientId = required(formData.get("client_id"), "Cliente");
  const employeeOneId = required(formData.get("employee_1"), "Funcionário 1");
  const employeeTwoId = required(formData.get("employee_2"), "Funcionário 2");
  const dataEscolta = required(formData.get("data_escolta"), "Data da escolta");
  const horaCarregamento = required(formData.get("hora_carregamento"), "Hora do carregamento");
  const encontroAlternativoPermitido = formData.get("encontro_alternativo_permitido") === "on";
  const localAlternativoEncontro = optional(formData.get("local_alternativo_encontro"));

  if (employeeOneId === employeeTwoId) {
    throw new Error("A escolta deve possuir exatamente 2 funcionários distintos.");
  }

  if (encontroAlternativoPermitido && !localAlternativoEncontro) {
    throw new Error("Informe o local alternativo de encontro.");
  }

  const { data: escort, error: escortError } = await admin
    .from("escorts")
    .insert({
      client_id: clientId,
      data_escolta: dataEscolta,
      hora_carregamento: horaCarregamento,
      local_carregamento: required(formData.get("local_carregamento"), "Local do carregamento"),
      observacao_operacional: optional(formData.get("observacao_operacional")),
      encontro_alternativo_permitido: encontroAlternativoPermitido,
      local_alternativo_encontro: localAlternativoEncontro,
      scheduled_end: scheduledEnd(dataEscolta, horaCarregamento),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (escortError || !escort) {
    throw new Error(escortError?.message ?? "Não foi possível criar a escolta.");
  }

  const { error: teamError } = await admin.from("escort_team").insert([
    { escort_id: escort.id, employee_id: employeeOneId, position: 1 },
    { escort_id: escort.id, employee_id: employeeTwoId, position: 2 },
  ]);

  if (teamError) {
    await admin.from("escorts").delete().eq("id", escort.id);
    throw new Error(teamError.message);
  }

  const { error: financialClientError } = await admin.from("financial_clients").insert({
    escort_id: escort.id,
    valor_base: Number(required(formData.get("valor_base"), "Valor base")),
  });

  if (financialClientError) {
    await admin.from("escorts").delete().eq("id", escort.id);
    throw new Error(financialClientError.message);
  }

  const { error: financialEmployeesError } = await admin.from("financial_employees").insert([
    { escort_id: escort.id, employee_id: employeeOneId },
    { escort_id: escort.id, employee_id: employeeTwoId },
  ]);

  if (financialEmployeesError) {
    await admin.from("escorts").delete().eq("id", escort.id);
    throw new Error(financialEmployeesError.message);
  }

  revalidatePath("/agendamentos");
  redirect(`/agendamentos/${escort.id}`);
}

export async function updateEscortStatusAction(escortId: string, status: EscortStatus) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Atualizações ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const profile = await requireProfile(["supervisor", "funcionario", "cliente"]);
  const supabase = createAdminSupabaseClient();

  if (profile.role === "funcionario") {
    if (!profile.employee_id) {
      throw new Error("Perfil de funcionário obrigatório para atualizar a escolta.");
    }

    if (!["Em andamento", "Finalizada"].includes(status)) {
      throw new Error("Funcionários só podem iniciar ou finalizar a missão.");
    }

    await ensureEmployeeAssigned(escortId, profile.employee_id);
  }

  if (profile.role === "cliente") {
    if (!profile.client_id) {
      throw new Error("Perfil de cliente obrigatório para iniciar a escolta.");
    }

    if (status !== "Em andamento") {
      throw new Error("Clientes só podem iniciar a corrida.");
    }

    await ensureClientOwnsEscort(escortId, profile.client_id);
  }

  const patch = status === "Em andamento" ? { status, inicio_real: new Date().toISOString() } : status === "Finalizada" ? { status, fim_real: new Date().toISOString() } : { status };
  const { error } = await supabase.from("escorts").update(patch).eq("id", escortId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/agendamentos/${escortId}`);
  revalidatePath("/funcionario/dashboard");
  revalidatePath("/dashboard");
}

export async function sendLocationAction(profile: Profile, formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Localização fica indisponível no modo supervisor temporário sem Supabase configurado.");
  }

  const currentProfile = await requireProfile(["funcionario"]);

  if (!currentProfile.employee_id) {
    throw new Error("Perfil de funcionário obrigatório para enviar localização.");
  }

  const supabase = createAdminSupabaseClient();
  const escortId = required(formData.get("escort_id"), "Escolta");
  await ensureEmployeeAssigned(escortId, currentProfile.employee_id);
  const { error } = await supabase.from("escort_locations").insert({
    escort_id: escortId,
    employee_id: currentProfile.employee_id,
    latitude: Number(required(formData.get("latitude"), "Latitude")),
    longitude: Number(required(formData.get("longitude"), "Longitude")),
    accuracy_meters: Number(optional(formData.get("accuracy_meters")) ?? 0),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/funcionario/dashboard");
}

export async function sendCurrentEmployeeLocationAction(formData: FormData) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Localização fica indisponível no modo supervisor temporário sem Supabase configurado.");
  }

  const profile = await requireProfile(["funcionario"]);

  if (!profile.employee_id) {
    throw new Error("Perfil de funcionário obrigatório para enviar localização.");
  }

  const supabase = createAdminSupabaseClient();
  const escortId = required(formData.get("escort_id"), "Escolta");
  await ensureEmployeeAssigned(escortId, profile.employee_id);
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
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Fotos ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

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