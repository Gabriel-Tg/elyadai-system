import { signInAction } from "@/services/auth-actions";

export function LoginForm({ error }: { error?: string }) {
  return (
    <form action={signInAction} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">Não foi possível entrar. Verifique seus dados.</p> : null}
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Email</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="email" required type="email" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Senha</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="password" required type="password" />
      </label>
      <button className="w-full rounded-md bg-stone-950 px-4 py-3 font-bold text-white hover:bg-stone-800" type="submit">
        Entrar
      </button>
    </form>
  );
}