"use client";

import { useState } from "react";

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueInCents / 100);
}

function decimalValue(valueInCents: number) {
  return (valueInCents / 100).toFixed(2);
}

function centsFromText(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits || 0);
}

export function CurrencyInput({ minCents = 1, name, required = true }: { minCents?: number; name: string; required?: boolean }) {
  const [valueInCents, setValueInCents] = useState(0);

  return (
    <>
      <input name={name} type="hidden" value={valueInCents >= minCents ? decimalValue(valueInCents) : ""} />
      <input
        className="field-control mt-2"
        inputMode="numeric"
        onChange={(event) => setValueInCents(centsFromText(event.target.value))}
        placeholder="R$ 0,00"
        required={required}
        type="text"
        value={valueInCents ? formatCurrency(valueInCents) : ""}
      />
    </>
  );
}