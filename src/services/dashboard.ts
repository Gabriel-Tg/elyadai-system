import { createServerSupabaseClient } from "@/lib/supabase-server";
import { shouldUseTemporarySupabaseFallback } from "@/lib/temporary-supervisor-mode";
import type { Employee, Escort, FinancialClient } from "@/types/database";

export async function getSupervisorDashboard() {
  if (shouldUseTemporarySupabaseFallback()) {
    return {
      employees: [],
      escorts: [],
      pendingPayments: [],
      availableEmployees: 0,
      busyEmployees: 0,
      todayMissions: 0,
      inProgressMissions: 0,
      finishedMissions: 0,
    };
  }

  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: employees }, { data: escorts }, { data: pendingPayments }] = await Promise.all([
    supabase.from("employees").select("*"),
    supabase.from("escorts").select("*, clients(id,nome), financial_clients(*)").order("data_escolta", { ascending: false }),
    supabase.from("financial_clients").select("*").eq("status_pagamento", "pendente"),
  ]);

  const employeeRows = (employees ?? []) as Employee[];
  const escortRows = (escorts ?? []) as Escort[];

  return {
    employees: employeeRows,
    escorts: escortRows,
    pendingPayments: (pendingPayments ?? []) as FinancialClient[],
    availableEmployees: employeeRows.filter((employee) => employee.status === "disponivel").length,
    busyEmployees: employeeRows.filter((employee) => employee.status === "ocupado").length,
    todayMissions: escortRows.filter((escort) => escort.data_escolta === today).length,
    inProgressMissions: escortRows.filter((escort) => escort.status === "Em andamento").length,
    finishedMissions: escortRows.filter((escort) => escort.status === "Finalizada").length,
  };
}

export async function getClientDashboard(clientId: string) {
  if (shouldUseTemporarySupabaseFallback()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("escorts")
    .select("*, clients(id,nome), financial_clients(*), escort_locations(*)")
    .eq("client_id", clientId)
    .order("data_escolta", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Escort[];
}

export async function getEmployeeDashboard(employeeId: string) {
  if (shouldUseTemporarySupabaseFallback()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("escorts")
    .select("*, clients(id,nome), escort_team!inner(employee_id), financial_employees(*), escort_photos(*)")
    .eq("escort_team.employee_id", employeeId)
    .order("data_escolta", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Escort[];
}