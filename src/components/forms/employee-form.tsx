import { createEmployeeAction } from "@/services/employees";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";

export function EmployeeForm() {
  return (
    <form action={createEmployeeAction} className="grid gap-4 rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.92)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] md:grid-cols-2">
      <label className="block">
        <span className="field-label">Nome</span>
        <input className="field-control mt-2" name="nome" required />
      </label>
      <label className="block">
        <span className="field-label">CPF</span>
        <MaskedInput kind="cpf" name="cpf" />
      </label>
      <label className="block">
        <span className="field-label">Telefone</span>
        <MaskedInput kind="phone" name="telefone" />
      </label>
      <label className="block">
        <span className="field-label">Email de acesso</span>
        <input className="field-control mt-2" name="email" required type="email" />
      </label>
      <label className="block">
        <span className="field-label">Senha inicial</span>
        <input className="field-control mt-2" minLength={8} name="senha_inicial" required type="password" />
      </label>
      <div className="md:col-span-2">
        <Button type="submit">
          Cadastrar funcionário e criar acesso
        </Button>
      </div>
    </form>
  );
}