create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('supervisor', 'funcionario', 'cliente');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.employee_status as enum ('disponivel', 'ocupado', 'folga');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.escort_status as enum ('Agendada', 'Em andamento', 'Finalizada', 'Cancelada', 'Reagendada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('pendente', 'pago');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('WhatsApp', 'Interna');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.extra_expense_category as enum ('combustivel', 'pedagio', 'alimentacao_extra', 'outros');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  role public.user_role not null,
  client_id uuid,
  employee_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null unique,
  telefone text not null,
  email text not null,
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null unique,
  telefone text not null,
  status public.employee_status not null default 'disponivel',
  profile_id uuid unique references public.profiles(id) on delete set null,
  folga_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.profiles add constraint profiles_client_fk foreign key (client_id) references public.clients(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.profiles add constraint profiles_employee_fk foreign key (employee_id) references public.employees(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.profiles add constraint profiles_role_target_check check (
    (role = 'cliente' and client_id is not null and employee_id is null)
    or (role = 'funcionario' and employee_id is not null and client_id is null)
    or (role = 'supervisor')
    or (client_id is null and employee_id is null)
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.escorts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  data_escolta date not null,
  hora_carregamento time not null,
  local_carregamento text not null,
  local_destino text not null,
  observacao_operacional text,
  encontro_alternativo_permitido boolean not null default false,
  local_alternativo_encontro text,
  status public.escort_status not null default 'Agendada',
  scheduled_end timestamptz not null,
  inicio_real timestamptz,
  fim_real timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint escorts_valid_real_times check (fim_real is null or inicio_real is null or fim_real >= inicio_real),
  constraint escorts_destination_required check (nullif(trim(local_destino), '') is not null),
  constraint escorts_alternative_required check (encontro_alternativo_permitido = false or nullif(trim(local_alternativo_encontro), '') is not null)
);

alter table public.escorts add column if not exists local_destino text not null default 'Destino não informado';

do $$ begin
  alter table public.escorts add constraint escorts_destination_required check (nullif(trim(local_destino), '') is not null);
exception when duplicate_object then null;
end $$;

create table if not exists public.escort_team (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  position smallint not null check (position in (1, 2)),
  assigned_at timestamptz not null default now(),
  unique (escort_id, employee_id),
  unique (escort_id, position)
);

create table if not exists public.escort_locations (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  accuracy_meters numeric(8, 2),
  recorded_at timestamptz not null default now()
);

create table if not exists public.escort_photos (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  url text not null,
  storage_path text not null unique,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.escort_status_history (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  old_status public.escort_status,
  new_status public.escort_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_clients (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null unique references public.escorts(id) on delete cascade,
  valor_base numeric(12, 2) not null check (valor_base >= 0),
  franquia_horas integer not null default 24 check (franquia_horas = 24),
  horas_excedentes integer not null default 0 check (horas_excedentes >= 0),
  valor_excedente numeric(12, 2) not null default 0 check (valor_excedente >= 0),
  valor_total numeric(12, 2) generated always as (valor_base + valor_excedente) stored,
  status_pagamento public.payment_status not null default 'pendente',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_employees (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  valor_missao numeric(12, 2) not null default 225 check (valor_missao = 225),
  adiantamento_alimentacao numeric(12, 2) not null default 100 check (adiantamento_alimentacao = 100),
  saldo_restante numeric(12, 2) generated always as (valor_missao - adiantamento_alimentacao) stored,
  pagamento_final numeric(12, 2) generated always as (valor_missao) stored,
  status_pagamento public.payment_status not null default 'pendente',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (escort_id, employee_id)
);

create table if not exists public.extra_expenses (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  categoria public.extra_expense_category not null,
  valor numeric(12, 2) not null check (valor >= 0),
  observacao text,
  receipt_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('payable', 'receivable')),
  category text not null check (category in ('combustivel', 'pedagio', 'alimentacao_extra', 'outros', 'cliente', 'funcionario', 'ajuste')),
  escort_id uuid references public.escorts(id) on delete set null,
  entry_date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  status_pagamento public.payment_status not null default 'pendente',
  payment_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_entries_paid_date_required check (status_pagamento = 'pendente' or payment_date is not null)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid references public.escorts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  canal public.notification_channel not null,
  target_role public.user_role not null,
  mensagem text not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at before update on public.clients for each row execute function public.touch_updated_at();
drop trigger if exists employees_touch_updated_at on public.employees;
create trigger employees_touch_updated_at before update on public.employees for each row execute function public.touch_updated_at();
drop trigger if exists escorts_touch_updated_at on public.escorts;
create trigger escorts_touch_updated_at before update on public.escorts for each row execute function public.touch_updated_at();
drop trigger if exists financial_clients_touch_updated_at on public.financial_clients;
create trigger financial_clients_touch_updated_at before update on public.financial_clients for each row execute function public.touch_updated_at();
drop trigger if exists financial_employees_touch_updated_at on public.financial_employees;
create trigger financial_employees_touch_updated_at before update on public.financial_employees for each row execute function public.touch_updated_at();
drop trigger if exists financial_entries_touch_updated_at on public.financial_entries;
create trigger financial_entries_touch_updated_at before update on public.financial_entries for each row execute function public.touch_updated_at();

create or replace function public.current_profile_id() returns uuid language sql stable security definer set search_path = public as $$ select id from public.profiles where user_id = auth.uid() $$;
create or replace function public.current_role() returns public.user_role language sql stable security definer set search_path = public as $$ select role from public.profiles where user_id = auth.uid() $$;
create or replace function public.current_client_id() returns uuid language sql stable security definer set search_path = public as $$ select client_id from public.profiles where user_id = auth.uid() $$;
create or replace function public.current_employee_id() returns uuid language sql stable security definer set search_path = public as $$ select employee_id from public.profiles where user_id = auth.uid() $$;
create or replace function public.is_supervisor() returns boolean language sql stable security definer set search_path = public as $$ select coalesce(public.current_role() = 'supervisor', false) $$;
create or replace function public.employee_has_escort(p_escort_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.escort_team team
    where team.escort_id = p_escort_id
      and team.employee_id = public.current_employee_id()
  )
$$;
create or replace function public.client_has_escort(p_escort_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.escorts escort
    where escort.id = p_escort_id
      and escort.client_id = public.current_client_id()
  )
$$;

create or replace function public.validate_escort_team_size() returns trigger language plpgsql as $$
declare
  team_count integer;
  target_escort_id uuid;
begin
  target_escort_id := coalesce(new.escort_id, old.escort_id);
  select count(*) into team_count from public.escort_team where escort_id = target_escort_id;
  if team_count < 1 or team_count > 2 then raise exception 'Cada escolta deve possuir 1 ou 2 funcionários'; end if;
  return null;
end;
$$;

drop trigger if exists escort_team_exactly_two on public.escort_team;
create constraint trigger escort_team_exactly_two after insert or update or delete on public.escort_team deferrable initially deferred for each row execute function public.validate_escort_team_size();

create or replace function public.prevent_employee_schedule_conflict() returns trigger language plpgsql as $$
declare
  new_start timestamptz;
  new_end timestamptz;
  conflict_exists boolean;
begin
  select (data_escolta + hora_carregamento)::timestamptz, scheduled_end into new_start, new_end from public.escorts where id = new.escort_id;
  select exists (
    select 1 from public.escort_team existing_team
    join public.escorts existing_escort on existing_escort.id = existing_team.escort_id
    where existing_team.employee_id = new.employee_id
      and existing_team.escort_id <> new.escort_id
      and existing_escort.status in ('Agendada', 'Em andamento')
      and new_start < existing_escort.scheduled_end
      and new_end > (existing_escort.data_escolta + existing_escort.hora_carregamento)::timestamptz
  ) into conflict_exists;
  if conflict_exists then raise exception 'Funcionário já está em outra escolta no mesmo horário'; end if;
  return new;
end;
$$;

drop trigger if exists escort_team_prevent_conflict on public.escort_team;
create trigger escort_team_prevent_conflict before insert or update on public.escort_team for each row execute function public.prevent_employee_schedule_conflict();

create or replace function public.record_status_history() returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into public.escort_status_history (escort_id, old_status, new_status, changed_by) values (new.id, old.status, new.status, public.current_profile_id());
  end if;
  return new;
end;
$$;

drop trigger if exists escorts_record_status_history on public.escorts;
create trigger escorts_record_status_history after update of status on public.escorts for each row execute function public.record_status_history();

create or replace function public.prevent_unauthorized_escort_changes() returns trigger language plpgsql security definer set search_path = public as $$
declare
  requester_role public.user_role;
begin
  if auth.uid() is null or public.is_supervisor() then
    return new;
  end if;

  requester_role := public.current_role();

  if old.client_id is distinct from new.client_id
    or old.data_escolta is distinct from new.data_escolta
    or old.hora_carregamento is distinct from new.hora_carregamento
    or old.local_carregamento is distinct from new.local_carregamento
    or old.local_destino is distinct from new.local_destino
    or old.observacao_operacional is distinct from new.observacao_operacional
    or old.encontro_alternativo_permitido is distinct from new.encontro_alternativo_permitido
    or old.local_alternativo_encontro is distinct from new.local_alternativo_encontro
    or old.scheduled_end is distinct from new.scheduled_end
    or old.inicio_real is distinct from new.inicio_real
    or old.fim_real is distinct from new.fim_real
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at then
    raise exception 'Apenas supervisores podem alterar dados críticos da escolta';
  end if;

  if requester_role = 'cliente' and new.status <> 'Em andamento' then
    raise exception 'Clientes não podem alterar o status da corrida';
  end if;

  if requester_role = 'cliente' and old.status is distinct from new.status then
    raise exception 'Clientes não podem alterar o status da corrida';
  end if;

  if requester_role = 'funcionario' and new.status not in ('Em andamento', 'Finalizada') then
    raise exception 'Funcionários só podem iniciar ou finalizar a missão';
  end if;

  if requester_role = 'funcionario' and old.status is distinct from new.status and not exists (
    select 1
    from public.escort_team team
    where team.escort_id = new.id
      and team.employee_id = public.current_employee_id()
      and team.position = 1
  ) then
    raise exception 'Apenas o funcionário 1 pode iniciar ou finalizar a missão';
  end if;

  if requester_role not in ('cliente', 'funcionario') then
    raise exception 'Perfil sem permissão para atualizar a escolta';
  end if;

  return new;
end;
$$;

drop trigger if exists escorts_prevent_unauthorized_changes on public.escorts;
create trigger escorts_prevent_unauthorized_changes before update on public.escorts for each row execute function public.prevent_unauthorized_escort_changes();

create or replace function public.validate_escort_status_transition() returns trigger language plpgsql as $$
declare
  team_count integer;
  active_conflict_exists boolean;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if not (
    (old.status = 'Agendada' and new.status in ('Em andamento', 'Cancelada', 'Reagendada'))
    or (old.status = 'Em andamento' and new.status = 'Finalizada')
  ) then
    raise exception 'Transição de status inválida: % -> %', old.status, new.status;
  end if;

  if new.status = 'Em andamento' then
    select count(*) into team_count from public.escort_team where escort_id = new.id;
    if team_count < 1 or team_count > 2 then
      raise exception 'Cada escolta deve possuir 1 ou 2 funcionários';
    end if;

    perform 1
    from public.employees employee
    where employee.id in (select team.employee_id from public.escort_team team where team.escort_id = new.id)
    for update;

    select exists (
      select 1
      from public.escort_team current_team
      join public.escort_team other_team on other_team.employee_id = current_team.employee_id and other_team.escort_id <> current_team.escort_id
      join public.escorts other_escort on other_escort.id = other_team.escort_id
      where current_team.escort_id = new.id
        and other_escort.status = 'Em andamento'
    ) into active_conflict_exists;

    if active_conflict_exists then
      raise exception 'Funcionário já está em outra missão ativa';
    end if;

    new.inicio_real := coalesce(new.inicio_real, now());
  end if;

  if new.status = 'Finalizada' then
    if new.inicio_real is null then
      raise exception 'Não é possível finalizar uma missão sem início registrado';
    end if;

    new.fim_real := coalesce(new.fim_real, now());
  end if;

  return new;
end;
$$;

drop trigger if exists escorts_validate_status_transition on public.escorts;
create trigger escorts_validate_status_transition before update of status on public.escorts for each row execute function public.validate_escort_status_transition();

create or replace function public.sync_employee_status_after_escort_status_update() returns trigger language plpgsql as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'Em andamento' then
    update public.employees employee
    set status = 'ocupado'
    from public.escort_team team
    where team.escort_id = new.id
      and team.employee_id = employee.id;

    return new;
  end if;

  if new.status in ('Finalizada', 'Cancelada') then
    update public.employees employee
    set status = 'disponivel'
    from public.escort_team team
    where team.escort_id = new.id
      and team.employee_id = employee.id
      and employee.status = 'ocupado'
      and not exists (
        select 1
        from public.escort_team other_team
        join public.escorts other_escort on other_escort.id = other_team.escort_id
        where other_team.employee_id = employee.id
          and other_team.escort_id <> new.id
          and other_escort.status = 'Em andamento'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists escorts_sync_employee_status on public.escorts;
create trigger escorts_sync_employee_status after update of status on public.escorts for each row execute function public.sync_employee_status_after_escort_status_update();

create or replace function public.update_financial_client_excess() returns trigger language plpgsql as $$
declare
  duration_hours integer;
  excess_hours integer;
begin
  if new.inicio_real is not null and new.fim_real is not null then
    duration_hours := ceiling(extract(epoch from (new.fim_real - new.inicio_real)) / 3600.0);
    excess_hours := greatest(0, duration_hours - 24);
    update public.financial_clients set horas_excedentes = excess_hours, valor_excedente = excess_hours * 100 where escort_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists escorts_update_financial_excess on public.escorts;
create trigger escorts_update_financial_excess after update of inicio_real, fim_real on public.escorts for each row execute function public.update_financial_client_excess();

drop function if exists public.create_escort_with_team(uuid, date, time, text, text, boolean, text, uuid, uuid, numeric);

create or replace function public.create_escort_with_team(
  p_client_id uuid,
  p_data_escolta date,
  p_hora_carregamento time,
  p_local_carregamento text,
  p_local_destino text,
  p_observacao_operacional text,
  p_encontro_alternativo_permitido boolean,
  p_local_alternativo_encontro text,
  p_employee_1 uuid,
  p_employee_2 uuid,
  p_valor_base numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_escort_id uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_supervisor() then raise exception 'Somente supervisores podem criar escoltas'; end if;
  if p_employee_1 is null then raise exception 'Informe o funcionário responsável pela escolta'; end if;
  if nullif(trim(coalesce(p_local_destino, '')), '') is null then raise exception 'Informe o local de destino'; end if;
  if p_employee_2 is not null and p_employee_2 = p_employee_1 then raise exception 'Funcionário 2 deve ser diferente do funcionário 1'; end if;
  if p_encontro_alternativo_permitido and nullif(trim(coalesce(p_local_alternativo_encontro, '')), '') is null then raise exception 'Informe o local alternativo de encontro'; end if;
  v_start := (p_data_escolta + p_hora_carregamento)::timestamptz;
  v_end := v_start + interval '24 hours';
  if exists (
    select 1 from public.escort_team team
    join public.escorts escort on escort.id = team.escort_id
    where team.employee_id in (p_employee_1, p_employee_2)
      and escort.status in ('Agendada', 'Em andamento')
      and v_start < escort.scheduled_end
      and v_end > (escort.data_escolta + escort.hora_carregamento)::timestamptz
  ) then raise exception 'Funcionário já está em outra escolta no mesmo horário'; end if;
  insert into public.escorts (client_id, data_escolta, hora_carregamento, local_carregamento, local_destino, observacao_operacional, encontro_alternativo_permitido, local_alternativo_encontro, scheduled_end, created_by)
  values (p_client_id, p_data_escolta, p_hora_carregamento, p_local_carregamento, p_local_destino, p_observacao_operacional, p_encontro_alternativo_permitido, p_local_alternativo_encontro, v_end, public.current_profile_id()) returning id into v_escort_id;
  insert into public.escort_team (escort_id, employee_id, position) values (v_escort_id, p_employee_1, 1);
  if p_employee_2 is not null then insert into public.escort_team (escort_id, employee_id, position) values (v_escort_id, p_employee_2, 2); end if;
  insert into public.financial_clients (escort_id, valor_base) values (v_escort_id, p_valor_base);
  insert into public.financial_employees (escort_id, employee_id) values (v_escort_id, p_employee_1);
  if p_employee_2 is not null then insert into public.financial_employees (escort_id, employee_id) values (v_escort_id, p_employee_2); end if;
  insert into public.notifications (escort_id, user_id, canal, target_role, mensagem)
  select v_escort_id, profiles.user_id, 'Interna', profiles.role, 'Nova escolta agendada' from public.profiles where profiles.client_id = p_client_id or profiles.employee_id in (p_employee_1, p_employee_2);
  return v_escort_id;
end;
$$;

create or replace function public.update_escort_status(
  p_escort_id uuid,
  p_status public.escort_status
) returns void language plpgsql security definer set search_path = public as $$
declare
  target_escort public.escorts%rowtype;
  requester_role public.user_role;
  requester_client_id uuid;
  requester_employee_id uuid;
begin
  select * into target_escort from public.escorts where id = p_escort_id for update;

  if not found then
    raise exception 'Missão não encontrada';
  end if;

  requester_role := public.current_role();
  requester_client_id := public.current_client_id();
  requester_employee_id := public.current_employee_id();

  if requester_role = 'supervisor' then
    null;
  elsif requester_role = 'cliente' then
    raise exception 'Clientes não podem alterar o status da corrida';
  elsif requester_role = 'funcionario' then
    if requester_employee_id is null or not exists (
      select 1 from public.escort_team team where team.escort_id = p_escort_id and team.employee_id = requester_employee_id and team.position = 1
    ) then
      raise exception 'Apenas o funcionário 1 pode iniciar ou finalizar a missão';
    end if;

    if p_status not in ('Em andamento', 'Finalizada') then
      raise exception 'Funcionários só podem iniciar ou finalizar a missão';
    end if;
  else
    raise exception 'Perfil sem permissão para atualizar a escolta';
  end if;

  update public.escorts
  set status = p_status
  where id = p_escort_id;
end;
$$;

create index if not exists profiles_user_idx on public.profiles (user_id);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists clients_profile_idx on public.clients (profile_id);
create index if not exists employees_status_idx on public.employees (status);
create index if not exists escorts_client_date_idx on public.escorts (client_id, data_escolta desc);
create index if not exists escorts_status_date_idx on public.escorts (status, data_escolta desc);
create index if not exists escort_team_employee_idx on public.escort_team (employee_id, escort_id);
create index if not exists escort_locations_live_idx on public.escort_locations (escort_id, recorded_at desc);
create index if not exists escort_photos_escort_idx on public.escort_photos (escort_id, taken_at desc);
create index if not exists financial_clients_status_idx on public.financial_clients (status_pagamento);
create index if not exists financial_employees_status_idx on public.financial_employees (status_pagamento);
create index if not exists financial_entries_status_idx on public.financial_entries (direction, status_pagamento, entry_date desc);
create index if not exists financial_entries_escort_idx on public.financial_entries (escort_id);
create index if not exists extra_expenses_escort_idx on public.extra_expenses (escort_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read_at);

insert into storage.buckets (id, name, public) values ('escort-photos', 'escort-photos', true) on conflict (id) do update set public = true;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.employees enable row level security;
alter table public.escorts enable row level security;
alter table public.escort_team enable row level security;
alter table public.escort_locations enable row level security;
alter table public.escort_photos enable row level security;
alter table public.escort_status_history enable row level security;
alter table public.financial_clients enable row level security;
alter table public.financial_employees enable row level security;
alter table public.financial_entries enable row level security;
alter table public.extra_expenses enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "supervisor total profiles" on public.profiles;
create policy "supervisor total profiles" on public.profiles for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "usuario ve proprio profile" on public.profiles;
create policy "usuario ve proprio profile" on public.profiles for select using (user_id = auth.uid());
drop policy if exists "usuario atualiza proprio profile" on public.profiles;
create policy "usuario atualiza proprio profile" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "supervisor total clients" on public.clients;
create policy "supervisor total clients" on public.clients for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve seu cadastro" on public.clients;
create policy "cliente ve seu cadastro" on public.clients for select using (id = public.current_client_id());
drop policy if exists "supervisor total employees" on public.employees;
create policy "supervisor total employees" on public.employees for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "funcionario ve seu cadastro" on public.employees;
create policy "funcionario ve seu cadastro" on public.employees for select using (id = public.current_employee_id());
drop policy if exists "supervisor total escorts" on public.escorts;
create policy "supervisor total escorts" on public.escorts for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve suas escorts" on public.escorts;
create policy "cliente ve suas escorts" on public.escorts for select using (client_id = public.current_client_id());
drop policy if exists "cliente reagenda cancela suas escorts" on public.escorts;
create policy "cliente reagenda cancela suas escorts" on public.escorts for update using (client_id = public.current_client_id()) with check (client_id = public.current_client_id());
drop policy if exists "funcionario ve missoes" on public.escorts;
create policy "funcionario ve missoes" on public.escorts for select using (public.employee_has_escort(id));
drop policy if exists "funcionario atualiza missoes" on public.escorts;
create policy "funcionario atualiza missoes" on public.escorts for update using (public.employee_has_escort(id)) with check (public.employee_has_escort(id));
drop policy if exists "supervisor total escort_team" on public.escort_team;
create policy "supervisor total escort_team" on public.escort_team for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve equipe das suas escorts" on public.escort_team;
create policy "cliente ve equipe das suas escorts" on public.escort_team for select using (public.client_has_escort(escort_id));
drop policy if exists "funcionario ve propria equipe" on public.escort_team;
create policy "funcionario ve propria equipe" on public.escort_team for select using (employee_id = public.current_employee_id());
drop policy if exists "supervisor total locations" on public.escort_locations;
create policy "supervisor total locations" on public.escort_locations for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve localizacoes das suas escorts" on public.escort_locations;
create policy "cliente ve localizacoes das suas escorts" on public.escort_locations for select using (public.client_has_escort(escort_id));
drop policy if exists "funcionario ve suas localizacoes" on public.escort_locations;
create policy "funcionario ve suas localizacoes" on public.escort_locations for select using (employee_id = public.current_employee_id());
drop policy if exists "funcionario envia sua localizacao" on public.escort_locations;
create policy "funcionario envia sua localizacao" on public.escort_locations for insert with check (employee_id = public.current_employee_id() and public.employee_has_escort(escort_id));
drop policy if exists "supervisor total photos" on public.escort_photos;
create policy "supervisor total photos" on public.escort_photos for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve fotos das suas escorts" on public.escort_photos;
create policy "cliente ve fotos das suas escorts" on public.escort_photos for select using (public.client_has_escort(escort_id));
drop policy if exists "funcionario ve suas fotos" on public.escort_photos;
create policy "funcionario ve suas fotos" on public.escort_photos for select using (employee_id = public.current_employee_id());
drop policy if exists "funcionario envia suas fotos" on public.escort_photos;
create policy "funcionario envia suas fotos" on public.escort_photos for insert with check (employee_id = public.current_employee_id() and public.employee_has_escort(escort_id));
drop policy if exists "supervisor ve historico" on public.escort_status_history;
create policy "supervisor ve historico" on public.escort_status_history for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve historico das suas escorts" on public.escort_status_history;
create policy "cliente ve historico das suas escorts" on public.escort_status_history for select using (public.client_has_escort(escort_id));
drop policy if exists "funcionario ve historico das suas escorts" on public.escort_status_history;
create policy "funcionario ve historico das suas escorts" on public.escort_status_history for select using (public.employee_has_escort(escort_id));
drop policy if exists "supervisor total financial_clients" on public.financial_clients;
create policy "supervisor total financial_clients" on public.financial_clients for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve seus pagamentos" on public.financial_clients;
create policy "cliente ve seus pagamentos" on public.financial_clients for select using (public.client_has_escort(escort_id));
drop policy if exists "supervisor total financial_employees" on public.financial_employees;
create policy "supervisor total financial_employees" on public.financial_employees for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "funcionario ve seus pagamentos" on public.financial_employees;
create policy "funcionario ve seus pagamentos" on public.financial_employees for select using (employee_id = public.current_employee_id());
drop policy if exists "supervisor total financial_entries" on public.financial_entries;
create policy "supervisor total financial_entries" on public.financial_entries for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve seus lancamentos financeiros" on public.financial_entries;
create policy "cliente ve seus lancamentos financeiros" on public.financial_entries for select using (direction = 'receivable' and public.client_has_escort(escort_id));
drop policy if exists "funcionario ve seus lancamentos financeiros" on public.financial_entries;
create policy "funcionario ve seus lancamentos financeiros" on public.financial_entries for select using (direction = 'payable' and public.employee_has_escort(escort_id));
drop policy if exists "supervisor total expenses" on public.extra_expenses;
create policy "supervisor total expenses" on public.extra_expenses for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "cliente ve gastos das suas escorts" on public.extra_expenses;
create policy "cliente ve gastos das suas escorts" on public.extra_expenses for select using (public.client_has_escort(escort_id));
drop policy if exists "funcionario ve gastos das suas escorts" on public.extra_expenses;
create policy "funcionario ve gastos das suas escorts" on public.extra_expenses for select using (public.employee_has_escort(escort_id));
drop policy if exists "supervisor total notifications" on public.notifications;
create policy "supervisor total notifications" on public.notifications for all using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "usuario ve notificacoes proprias" on public.notifications;
create policy "usuario ve notificacoes proprias" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "usuario marca notificacao propria" on public.notifications;
create policy "usuario marca notificacao propria" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "supervisor gerencia storage fotos" on storage.objects;
create policy "supervisor gerencia storage fotos" on storage.objects for all using (bucket_id = 'escort-photos' and public.is_supervisor()) with check (bucket_id = 'escort-photos' and public.is_supervisor());
drop policy if exists "funcionario envia storage fotos" on storage.objects;
create policy "funcionario envia storage fotos" on storage.objects for insert with check (bucket_id = 'escort-photos' and public.current_role() = 'funcionario');
drop policy if exists "usuarios autenticados leem storage fotos" on storage.objects;
create policy "usuarios autenticados leem storage fotos" on storage.objects for select using (bucket_id = 'escort-photos' and auth.uid() is not null);

do $$ begin alter publication supabase_realtime add table public.escort_locations; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;