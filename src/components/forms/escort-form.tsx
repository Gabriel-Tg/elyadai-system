"use client";

import { useActionState } from "react";
import { createEscortAction } from "@/services/escorts";
import { MapsSearchField } from "@/components/maps/maps-search-field";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Client, Employee } from "@/types/database";

export function EscortForm({ clients, employees }: { clients: Client[]; employees: Employee[] }) {
  const [state, formAction, isPending] = useActionState(createEscortAction, {});

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.92)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] md:grid-cols-2">
      {state.error ? <p className="rounded-md border border-[var(--alert-red)] bg-[rgba(218,54,51,0.16)] p-3 text-sm font-semibold text-[#ffb4b2] md:col-span-2">{state.error}</p> : null}
      <label className="block">
        <span className="field-label">Cliente</span>
        <select className="field-control mt-2" name="client_id" required>
          <option value="">Selecione</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Data da escolta</span>
        <input className="field-control mt-2" name="data_escolta" required type="date" />
      </label>
      <label className="block">
        <span className="field-label">Hora do carregamento</span>
        <input className="field-control mt-2" name="hora_carregamento" required type="time" />
      </label>
      <label className="block">
        <span className="field-label">Valor base</span>
        <CurrencyInput name="valor_base" />
      </label>
      <MapsSearchField label="Local do carregamento" name="local_carregamento" required />
      <MapsSearchField label="Local de destino" name="local_destino" required />
      <label className="block md:col-span-2">
        <span className="field-label">Observação operacional</span>
        <textarea className="field-control mt-2 min-h-24" name="observacao_operacional" />
      </label>
      <label className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[rgba(13,17,23,0.5)] p-3 md:col-span-2">
        <input className="size-4 accent-[var(--tactical-blue)]" name="encontro_alternativo_permitido" type="checkbox" />
        <span className="field-label">Encontro alternativo permitido?</span>
      </label>
      <MapsSearchField label="Local alternativo de encontro" name="local_alternativo_encontro" />
      <label className="block">
        <span className="field-label">Funcionário 1</span>
        <select className="field-control mt-2" name="employee_1" required>
          <option value="">Selecione</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nome}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Funcionário 2</span>
        <select className="field-control mt-2" name="employee_2">
          <option value="">Sem funcionário 2</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nome}</option>)}
        </select>
      </label>
      <div className="md:col-span-2">
        <Button disabled={isPending} type="submit">
          {isPending ? "Criando" : "Criar agendamento"}
        </Button>
      </div>
    </form>
  );
}