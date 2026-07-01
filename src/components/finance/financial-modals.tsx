"use client";

import { useRef } from "react";
import { BanknoteArrowDown, BanknoteArrowUp, Fuel, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { createFinancialEntryAction, settlePayableAction, settleReceivableAction } from "@/services/financial";

type SelectOption = {
  label: string;
  value: string;
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function closeDialog(dialog: React.RefObject<HTMLDialogElement | null>) {
  dialog.current?.close();
}

function openDialog(dialog: React.RefObject<HTMLDialogElement | null>) {
  dialog.current?.showModal();
}

function DialogFrame({ children, dialogRef, title }: { children: React.ReactNode; dialogRef: React.RefObject<HTMLDialogElement | null>; title: string }) {
  return (
    <dialog ref={dialogRef} className="w-[min(92vw,560px)] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop:bg-black/70">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button className="rounded-md border border-[var(--border)] px-3 py-1 text-sm font-bold text-[var(--muted-strong)] hover:bg-[var(--surface-elevated)]" onClick={() => closeDialog(dialogRef)} type="button">Fechar</button>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

function EntryForm({ direction, escortOptions, onDone }: { direction: "payable" | "receivable"; escortOptions: SelectOption[]; onDone: () => void }) {
  const isPayable = direction === "payable";

  return (
    <form action={async (formData) => { await createFinancialEntryAction(formData); onDone(); }} className="grid gap-4">
      <input name="direction" type="hidden" value={direction} />
      <label className="block">
        <span className="field-label">Categoria</span>
        <select className="field-control mt-2" name="category" required defaultValue={isPayable ? "combustivel" : "cliente"}>
          {isPayable ? (
            <>
              <option value="combustivel">Gasolina / combustível</option>
              <option value="pedagio">Pedágio</option>
              <option value="alimentacao_extra">Alimentação extra</option>
              <option value="outros">Outros</option>
            </>
          ) : (
            <>
              <option value="cliente">Cliente</option>
              <option value="ajuste">Ajuste</option>
              <option value="outros">Outros</option>
            </>
          )}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Vincular corrida</span>
        <select className="field-control mt-2" name="escort_id" defaultValue="">
          <option value="">Sem corrida vinculada</option>
          {escortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Data do lançamento</span>
          <input className="field-control mt-2" defaultValue={todayKey()} name="entry_date" required type="date" />
        </label>
        <label className="block">
          <span className="field-label">Valor</span>
          <CurrencyInput name="amount" />
        </label>
      </div>
      <label className="block">
        <span className="field-label">Descrição</span>
        <textarea className="field-control mt-2 min-h-24" name="description" required />
      </label>
      <Button type="submit" variant={isPayable ? "warning" : "success"}>{isPayable ? "Gerar conta a pagar" : "Gerar conta a receber"}</Button>
    </form>
  );
}

function SettlementForm({ emptyText, label, options, onDone, type }: { emptyText: string; label: string; options: SelectOption[]; onDone: () => void; type: "payable" | "receivable" }) {
  const action = type === "payable" ? settlePayableAction : settleReceivableAction;

  return (
    <form action={async (formData) => { await action(formData); onDone(); }} className="grid gap-4">
      <label className="block">
        <span className="field-label">{label}</span>
        <select className="field-control mt-2" disabled={!options.length} name="target" required>
          {options.length ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value="">{emptyText}</option>}
        </select>
      </label>
      <label className="block">
        <span className="field-label">{type === "payable" ? "Data de pagamento" : "Data de recebimento"}</span>
        <input className="field-control mt-2" defaultValue={todayKey()} disabled={!options.length} name="payment_date" required type="date" />
      </label>
      <Button disabled={!options.length} type="submit" variant={type === "payable" ? "warning" : "success"}>{type === "payable" ? "Registrar pagamento" : "Registrar recebimento"}</Button>
    </form>
  );
}

export function FinancialModals({ escortOptions, payableOptions, receivableOptions }: { escortOptions: SelectOption[]; payableOptions: SelectOption[]; receivableOptions: SelectOption[] }) {
  const payableEntryDialog = useRef<HTMLDialogElement>(null);
  const receivableEntryDialog = useRef<HTMLDialogElement>(null);
  const payableSettlementDialog = useRef<HTMLDialogElement>(null);
  const receivableSettlementDialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => openDialog(payableEntryDialog)} type="button" variant="warning"><Fuel size={18} /> Lançamento diverso</Button>
        <Button onClick={() => openDialog(receivableEntryDialog)} type="button" variant="success"><ReceiptText size={18} /> Lançamento a receber</Button>
        <Button onClick={() => openDialog(payableSettlementDialog)} type="button" variant="secondary"><BanknoteArrowDown size={18} /> Registrar pagamento</Button>
        <Button onClick={() => openDialog(receivableSettlementDialog)} type="button" variant="primary"><BanknoteArrowUp size={18} /> Registrar recebimento</Button>
      </div>

      <DialogFrame dialogRef={payableEntryDialog} title="Lançamento financeiro a pagar">
        <EntryForm direction="payable" escortOptions={escortOptions} onDone={() => closeDialog(payableEntryDialog)} />
      </DialogFrame>
      <DialogFrame dialogRef={receivableEntryDialog} title="Lançamento financeiro a receber">
        <EntryForm direction="receivable" escortOptions={escortOptions} onDone={() => closeDialog(receivableEntryDialog)} />
      </DialogFrame>
      <DialogFrame dialogRef={payableSettlementDialog} title="Registrar pagamento">
        <SettlementForm emptyText="Nenhuma conta a pagar pendente" label="Conta a pagar" onDone={() => closeDialog(payableSettlementDialog)} options={payableOptions} type="payable" />
      </DialogFrame>
      <DialogFrame dialogRef={receivableSettlementDialog} title="Registrar recebimento">
        <SettlementForm emptyText="Nenhuma conta a receber pendente" label="Conta a receber" onDone={() => closeDialog(receivableSettlementDialog)} options={receivableOptions} type="receivable" />
      </DialogFrame>
    </>
  );
}