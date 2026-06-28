import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getHomeForRole } from "@/lib/permissions";
import { temporarySupervisorMode, temporarySupervisorProfile } from "@/lib/temporary-supervisor-mode";
import type { Profile, UserRole } from "@/types/database";

export async function getCurrentProfile() {
  if (temporarySupervisorMode) {
    return temporarySupervisorProfile;
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<Profile>();

  return data;
}

export async function requireProfile(allowedRoles?: UserRole[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(getHomeForRole(profile.role));
  }

  return profile;
}
