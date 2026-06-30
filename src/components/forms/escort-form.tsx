import { createEscortAction } from "@/services/escorts";
import type { Client, Employee } from "@/types/database";

export function EscortForm({ clients, employees }: { clients: Client[]; employees: Employee[] }) {
  return (
    <form action={createEscortAction} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Cliente</span>
        <select className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="client_id" required>
          <option value="">Selecione</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Data da escolta</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="data_escolta" required type="date" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Hora do carregamento</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="hora_carregamento" required type="time" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Valor base</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" min="0" name="valor_base" required step="0.01" type="number" />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-stone-700">Local do carregamento</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="local_carregamento" required />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-stone-700">Observação operacional</span>
        <textarea className="mt-2 min-h-24 w-full rounded-md border border-stone-300 px-3 py-3" name="observacao_operacional" />
      </label>
      <label className="flex items-center gap-3 rounded-md border border-stone-200 p-3 md:col-span-2">
        <input name="encontro_alternativo_permitido" type="checkbox" />
        <span className="text-sm font-bold text-stone-700">Encontro alternativo permitido?</span>
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-bold text-stone-700">Local alternativo de encontro</span>
        <input className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="local_alternativo_encontro" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Funcionário 1</span>
        <select className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3" name="employee_1" required>
          <option value="">Selecione</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nome} - {employee.status}</option>)}
        </select>
      </label>
      <div className="md:col-span-2">
        <button className="rounded-md bg-stone-950 px-4 py-3 font-bold text-white hover:bg-stone-800" type="submit">
          Criar agendamento
        </button>
      </div>
    </form>
  );
}