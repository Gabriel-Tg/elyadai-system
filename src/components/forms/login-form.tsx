import { signInAction } from "@/services/auth-actions";
import { Button } from "@/components/ui/button";

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
      <form action={signInAction} className="space-y-4 rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.94)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        {errorMessage ? <p className="rounded-md border border-[var(--alert-red)] bg-[rgba(218,54,51,0.16)] p-3 text-sm font-semibold text-[#ffb4b2]">{errorMessage}</p> : null}
        <label className="block">
          <span className="field-label">Email</span>
          <input className="field-control mt-2" name="email" required type="email" />
        </label>
        <label className="block">
          <span className="field-label">Senha</span>
          <input className="field-control mt-2" name="password" required type="password" />
        </label>
        <Button className="w-full" type="submit">
          Entrar
        </Button>
      </form>
    </div>
  );
}