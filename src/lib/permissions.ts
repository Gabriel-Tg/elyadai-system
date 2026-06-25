import type { Profile, UserRole } from "@/types/database";

export const roleHome: Record<UserRole, string> = {
  supervisor: "/dashboard",
  cliente: "/cliente/dashboard",
  funcionario: "/funcionario/dashboard",
};

export function canAccessRole(profile: Profile | null, allowedRoles: UserRole[]) {
  return Boolean(profile && allowedRoles.includes(profile.role));
}

export function getHomeForRole(role: UserRole) {
  return roleHome[role];
}