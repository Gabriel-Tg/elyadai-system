import type { Profile } from "@/types/database";

export const temporarySupervisorMode = true;

export const temporarySupervisorProfile: Profile = {
  id: "temporary-supervisor",
  user_id: "temporary-supervisor",
  nome: "Supervisor Temporario",
  email: "supervisor@local",
  role: "supervisor",
  client_id: null,
  employee_id: null,
  created_at: "2026-06-27T00:00:00.000Z",
  updated_at: "2026-06-27T00:00:00.000Z",
};

export function shouldUseTemporarySupabaseFallback() {
  return temporarySupervisorMode && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}