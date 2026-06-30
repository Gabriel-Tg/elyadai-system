"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import { optional, required } from "@/validators/records";
import type { Escort, EscortLocation, EscortPhoto, EscortStatus, Profile } from "@/types/database";

const ACTIVE_ESCORT_STATUS: EscortStatus = "Em andamento";

const ALLOWED_STATUS_TRANSITIONS: Record<EscortStatus, EscortStatus[]> = {
  Agendada: ["Em andamento", "Cancelada", "Reagendada"],
  "Em andamento": ["Finalizada"],
  Finalizada: [],
  Cancelada: [],
  Reagendada: [],
};

function friendlyDatabaseError(error: { message: string } | null | undefined, fallback: string) {
  if (!error?.message) {
    return fallback;
  }

  if (error.message.includes("Funcionário já está em outra escolta")) {
    return "Um dos funcionários selecionados já está vinculado a outra escolta no mesmo horário.";
  }

  if (error.message.includes("Cada escolta deve possuir exatamente 2 funcionários") || error.message.includes("exatamente 2 funcionários distintos")) {
    return "A escolta deve possuir exatamente 2 funcionários distintos.";
  }

  if (error.message.includes("Informe o local alternativo")) {
    return "Informe o local alternativo de encontro.";
  }

  return error.message;
}

function ensureStatusTransition(currentStatus: EscortStatus, nextStatus: EscortStatus) {
  if (!ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(`Transição de status inválida: ${currentStatus} -> ${nextStatus}.`);
  }
}

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

  await requireProfile(["supervisor"]);
  const supabase = await createServerSupabaseClient();
  const clientId = required(formData.get("client_id"), "Cliente");
  const employeeOneId = required(formData.get("employee_1"), "Funcionário 1");
  const employeeTwoId = required(formData.get("employee_2"), "Funcionário 2");
  const dataEscolta = required(formData.get("data_escolta"), "Data da escolta");
  const horaCarregamento = required(formData.get("hora_carregamento"), "Hora do carregamento");
  const encontroAlternativoPermitido = formData.get("encontro_alternativo_permitido") === "on";
  const localAlternativoEncontro = optional(formData.get("local_alternativo_encontro"));
  const valorBase = Number(required(formData.get("valor_base"), "Valor base"));

  if (employeeOneId === employeeTwoId) {
    throw new Error("A escolta deve possuir exatamente 2 funcionários distintos.");
  }

  if (encontroAlternativoPermitido && !localAlternativoEncontro) {
    throw new Error("Informe o local alternativo de encontro.");
  }

  scheduledEnd(dataEscolta, horaCarregamento);

  const { data: escortId, error } = await supabase.rpc("create_escort_with_team", {
    p_client_id: clientId,
    p_data_escolta: dataEscolta,
    p_hora_carregamento: horaCarregamento,
    p_local_carregamento: required(formData.get("local_carregamento"), "Local do carregamento"),
    p_observacao_operacional: optional(formData.get("observacao_operacional")),
    p_encontro_alternativo_permitido: encontroAlternativoPermitido,
    p_local_alternativo_encontro: localAlternativoEncontro,
    p_employee_1: employeeOneId,
    p_employee_2: employeeTwoId,
    p_valor_base: valorBase,
  });

  if (error || !escortId) {
    console.error("[createEscortAction] Falha ao criar escolta via RPC", { error });
    throw new Error(friendlyDatabaseError(error, "Não foi possível criar a escolta. Tente novamente."));
  }

  revalidatePath("/agendamentos");
  redirect(`/agendamentos/${escortId}`);
}

async function employeeHasAnotherActiveEscort(employeeId: string, currentEscortId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("escort_team")
    .select("escort_id, escorts!inner(status)")
    .eq("employee_id", employeeId)
    .neq("escort_id", currentEscortId)
    .eq("escorts.status", ACTIVE_ESCORT_STATUS)
    .limit(1);

  if (error) {
    console.error("[employeeHasAnotherActiveEscort] Falha ao validar missão ativa", { employeeId, currentEscortId, error });
    throw new Error("Não foi possível validar se o funcionário possui outra missão ativa.");
  }

  return Boolean(data?.length);
}

async function syncEmployeeStatusForEscort(escortId: string, status: EscortStatus, employeeIds: string[]) {
  const admin = createAdminSupabaseClient();

  if (status === ACTIVE_ESCORT_STATUS) {
    const { error } = await admin.from("employees").update({ status: "ocupado" }).in("id", employeeIds);

    if (error) {
      console.error("[syncEmployeeStatusForEscort] Falha ao marcar funcionários como ocupados", { escortId, employeeIds, error });
      throw new Error("A missão foi atualizada, mas não foi possível marcar a equipe como ocupada.");
    }

    return;
  }

  if (!["Finalizada", "Cancelada"].includes(status)) {
    return;
  }

  const availabilityChecks = await Promise.all(employeeIds.map(async (employeeId) => ({
    employeeId,
    hasAnotherActiveEscort: await employeeHasAnotherActiveEscort(employeeId, escortId),
  })));
  const releasableEmployeeIds = availabilityChecks.filter((check) => !check.hasAnotherActiveEscort).map((check) => check.employeeId);

  if (!releasableEmployeeIds.length) {
    return;
  }

  const { error } = await admin.from("employees").update({ status: "disponivel" }).in("id", releasableEmployeeIds).eq("status", "ocupado");

  if (error) {
    console.error("[syncEmployeeStatusForEscort] Falha ao liberar funcionários", { escortId, releasableEmployeeIds, error });
    throw new Error("A missão foi atualizada, mas não foi possível liberar a equipe com segurança.");
  }
}

export async function updateEscortStatusAction(escortId: string, status: EscortStatus) {
  if (shouldUseTemporarySupabaseFallback()) {
    throw new Error("Atualizações ficam indisponíveis no modo supervisor temporário sem Supabase configurado.");
  }

  const profile = await requireProfile(["supervisor", "funcionario", "cliente"]);
  const supabase = createAdminSupabaseClient();

  const { data: currentEscort, error: currentEscortError } = await supabase
    .from("escorts")
    .select("id, status, inicio_real, fim_real, escort_team(employee_id)")
    .eq("id", escortId)
    .maybeSingle();

  if (currentEscortError) {
    console.error("[updateEscortStatusAction] Falha ao carregar escolta atual", { escortId, error: currentEscortError });
    throw new Error("Não foi possível carregar a missão para atualizar o status.");
  }

  if (!currentEscort) {
    throw new Error("Missão não encontrada.");
  }

  ensureStatusTransition(currentEscort.status as EscortStatus, status);

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
  const { data: updatedEscort, error } = await supabase.from("escorts").update(patch).eq("id", escortId).eq("status", currentEscort.status).select("id").maybeSingle();

  if (error || !updatedEscort) {
    console.error("[updateEscortStatusAction] Falha ao atualizar status da missão", { escortId, status, error });
    throw new Error(error ? friendlyDatabaseError(error, "Não foi possível atualizar o status da missão.") : "O status da missão mudou durante a atualização. Recarregue a página e tente novamente.");
  }

  try {
    const employeeIds = (currentEscort.escort_team ?? []).map((team) => team.employee_id).filter(Boolean);
    await syncEmployeeStatusForEscort(escortId, status, employeeIds);
  } catch (syncError) {
    const rollbackPatch = {
      status: currentEscort.status,
      inicio_real: currentEscort.inicio_real,
      fim_real: currentEscort.fim_real,
    };
    const { error: rollbackError } = await supabase.from("escorts").update(rollbackPatch).eq("id", escortId).eq("status", status);

    console.error("[updateEscortStatusAction] Falha ao sincronizar equipe após status da missão", { escortId, status, syncError, rollbackError });

    if (rollbackError) {
      throw new Error("A missão foi atualizada, mas houve falha ao sincronizar a equipe. Acione o suporte para revisar a missão.");
    }

    throw syncError;
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