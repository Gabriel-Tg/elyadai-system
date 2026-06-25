export function required(value: FormDataEntryValue | null, field: string) {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`${field} é obrigatório.`);
  }

  return text;
}

export function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function initialPassword(value: FormDataEntryValue | null) {
  const password = required(value, "Senha inicial");

  if (password.length < 8) {
    throw new Error("A senha inicial deve ter pelo menos 8 caracteres.");
  }

  return password;
}