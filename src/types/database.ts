export type UserRole = "supervisor" | "funcionario" | "cliente";
export type EmployeeStatus = "disponivel" | "ocupado" | "folga";
export type EscortStatus = "Agendada" | "Em andamento" | "Finalizada" | "Cancelada" | "Reagendada";
export type PaymentStatus = "pendente" | "pago";
export type FinancialEntryDirection = "payable" | "receivable";
export type FinancialEntryCategory = "combustivel" | "pedagio" | "alimentacao_extra" | "outros" | "cliente" | "funcionario" | "ajuste";

export type Profile = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: UserRole;
  client_id: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  status: EmployeeStatus;
  profile_id: string | null;
  folga_em: string | null;
  created_at: string;
  updated_at: string;
};

export type Escort = {
  id: string;
  client_id: string;
  data_escolta: string;
  hora_carregamento: string;
  local_carregamento: string;
  local_destino: string;
  observacao_operacional: string | null;
  encontro_alternativo_permitido: boolean;
  local_alternativo_encontro: string | null;
  status: EscortStatus;
  scheduled_end: string;
  inicio_real: string | null;
  fim_real: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "id" | "nome" | "cnpj" | "telefone" | "email"> | null;
  escort_team?: EscortTeam[];
  financial_clients?: FinancialClient[];
  extra_expenses?: ExtraExpense[];
};

export type EscortTeam = {
  id: string;
  escort_id: string;
  employee_id: string;
  position: 1 | 2;
  assigned_at: string;
  employees?: Pick<Employee, "id" | "nome" | "telefone" | "status"> | null;
};

export type EscortLocation = {
  id: string;
  escort_id: string;
  employee_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  recorded_at: string;
};

export type EscortPhoto = {
  id: string;
  escort_id: string;
  employee_id: string;
  url: string;
  storage_path: string;
  taken_at: string;
  created_at: string;
};

export type FinancialClient = {
  id: string;
  escort_id: string;
  valor_base: number;
  franquia_horas: number;
  horas_excedentes: number;
  valor_excedente: number;
  valor_total: number;
  status_pagamento: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  escorts?: Pick<Escort, "id" | "data_escolta" | "local_carregamento" | "local_destino"> & { clients?: Pick<Client, "nome"> | null } | null;
};

export type FinancialEmployee = {
  id: string;
  escort_id: string;
  employee_id: string;
  valor_missao: number;
  adiantamento_alimentacao: number;
  saldo_restante: number;
  pagamento_final: number;
  status_pagamento: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  employees?: Pick<Employee, "id" | "nome"> | null;
  escorts?: Pick<Escort, "id" | "data_escolta"> | null;
};

export type ExtraExpense = {
  id: string;
  escort_id: string;
  categoria: "combustivel" | "pedagio" | "alimentacao_extra" | "outros";
  valor: number;
  observacao: string | null;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
};

export type FinancialEntry = {
  id: string;
  direction: FinancialEntryDirection;
  category: FinancialEntryCategory;
  escort_id: string | null;
  entry_date: string;
  amount: number;
  description: string;
  status_pagamento: PaymentStatus;
  payment_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  escorts?: Pick<Escort, "id" | "data_escolta" | "local_carregamento" | "local_destino"> & { clients?: Pick<Client, "nome"> | null } | null;
};

export type FinancialEscortOption = Pick<Escort, "id" | "data_escolta" | "local_carregamento" | "local_destino"> & {
  clients?: Pick<Client, "nome"> | null;
};

export type NotificationItem = {
  id: string;
  escort_id: string | null;
  user_id: string | null;
  canal: "WhatsApp" | "Interna";
  target_role: UserRole;
  mensagem: string;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile };
      clients: { Row: Client };
      employees: { Row: Employee };
      escorts: { Row: Escort };
      escort_team: { Row: EscortTeam };
      escort_locations: { Row: EscortLocation };
      escort_photos: { Row: EscortPhoto };
      financial_clients: { Row: FinancialClient };
      financial_employees: { Row: FinancialEmployee };
      financial_entries: { Row: FinancialEntry };
      extra_expenses: { Row: ExtraExpense };
      notifications: { Row: NotificationItem };
    };
  };
};