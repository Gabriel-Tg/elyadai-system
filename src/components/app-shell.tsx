import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import type { Profile } from "@/types/database";

export function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  return (
    <div className="tactical-shell tactical-scanline min-h-screen text-[var(--foreground)] lg:flex">
      <Sidebar role={profile.role} />
      <div className="min-w-0 flex-1">
        <Navbar profile={profile} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}