"use client";

import { useState } from "react";
import { formatCnpj, formatCpf, formatPhone } from "@/lib/formatters";

type MaskKind = "cnpj" | "cpf" | "phone";

function formatValue(value: string, kind: MaskKind) {
  if (kind === "cnpj") return formatCnpj(value);
  if (kind === "cpf") return formatCpf(value);
  return formatPhone(value);
}

export function MaskedInput({ kind, name, required = true }: { kind: MaskKind; name: string; required?: boolean }) {
  const [value, setValue] = useState("");

  return (
    <input
      className="field-control mt-2"
      inputMode="numeric"
      name={name}
      onChange={(event) => setValue(formatValue(event.target.value, kind))}
      required={required}
      type="text"
      value={value}
    />
  );
}