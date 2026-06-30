import { signInAction, signUpSupervisorAction } from "@/services/auth-actions";

const errorMessages: Record<string, string> = {
  "cadastro-login": "Supervisor criado, mas não foi possível iniciar a sessão automaticamente. Tente entrar com o email e senha cadastrados.",
  "cadastro-supervisor": "Não foi possível cadastrar o supervisor. Verifique os dados e tente novamente.",
  "credenciais-invalidas": "Email ou senha inválidos.",
  "email-ja-cadastrado": "Este email já está cadastrado. Use a área de entrada para acessar.",
  "perfil-nao-encontrado": "Usuário autenticado sem perfil de acesso. Cadastre o supervisor novamente ou revise a tabela profiles.",
  "service-role-invalida": "A chave service_role do Supabase está inválida. Atualize SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor.",
};

export function LoginForm({ error }: { error?: string }) {
  const errorMessage = error ? errorMessages[error] ?? "Não foi possível concluir a solicitação. Verifique os dados informados." : null;

  return (
    <div className="space-y-4">
      <form action={signInAction} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        {errorMessage ? <p className="rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">{errorMessage}</p> : null}
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

      <form action={signUpSupervisorAction} className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/90 p-6 shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-950">Cadastrar supervisor</h2>
          <p className="mt-1 text-sm text-stone-700">Crie o primeiro acesso administrativo e entre no sistema.</p>
        </div>
        <label className="block">
          <span className="text-sm font-bold text-stone-700">Nome</span>
          <input className="mt-2 w-full rounded-md border border-emerald-200 bg-white px-3 py-3" name="nome" required type="text" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-stone-700">Email</span>
          <input className="mt-2 w-full rounded-md border border-emerald-200 bg-white px-3 py-3" name="email" required type="email" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-stone-700">Senha</span>
          <input className="mt-2 w-full rounded-md border border-emerald-200 bg-white px-3 py-3" minLength={8} name="password" required type="password" />
        </label>
        <button className="w-full rounded-md bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800" type="submit">
          Cadastrar e acessar
        </button>
      </form>
    </div>
  );
}