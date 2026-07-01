import { LogOut, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/services/auth-actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database";

export function Navbar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(13,17,23,0.82)] backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md border border-[var(--operational-green)] bg-[rgba(35,134,54,0.16)] text-[#7ee787] shadow-[var(--glow-green)]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Operador autenticado</p>
            <strong className="font-display text-[var(--foreground)]">{profile.nome}</strong>
          </div>
        </div>
        <form action={signOutAction}>
          <Button variant="secondary" type="submit">
            <LogOut size={16} /> Sair
          </Button>
        </form>
      </div>
    </header>
  );
}