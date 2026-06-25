import { LogOut, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/services/auth-actions";
import type { Profile } from "@/types/database";

export function Navbar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-stone-950 text-white">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Elyadai Serviços</p>
            <strong className="font-display text-stone-950">{profile.nome}</strong>
          </div>
        </div>
        <form action={signOutAction}>
          <button className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-800 hover:bg-stone-100" type="submit">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </div>
    </header>
  );
}