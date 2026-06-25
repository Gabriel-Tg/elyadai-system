import { createClientAction } from "@/services/clients";

export function ClientForm() {
  return (
    <form action={createClientAction} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Nome</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="nome" required />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">CNPJ</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="cnpj" required />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Telefone</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="telefone" required />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Email de acesso</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="email" required type="email" />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-stone-700">Senha inicial</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" minLength={8} name="senha_inicial" required type="password" />
      </label>
      <div className="md:col-span-2">
        <button className="rounded-md bg-stone-950 px-4 py-3 font-bold text-white hover:bg-stone-800" type="submit">
          Cadastrar cliente e criar acesso
        </button>
      </div>
    </form>
  );
}