create extension if not exists "pgcrypto";

create type public.user_role as enum ('supervisor', 'funcionario', 'cliente');
create type public.employee_status as enum ('disponivel', 'ocupado', 'folga');
create type public.escort_status as enum ('Agendada', 'Em andamento', 'Finalizada', 'Cancelada', 'Reagendada');
create type public.payment_status as enum ('pendente', 'pago');
create type public.notification_channel as enum ('WhatsApp', 'Interna');
create type public.extra_expense_category as enum ('combustivel', 'pedagio', 'alimentacao_extra', 'outros');

create table public.profiles (
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

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null unique,
  telefone text not null,
  email text not null,
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
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

alter table public.profiles
  add constraint profiles_client_fk foreign key (client_id) references public.clients(id) on delete set null,
  add constraint profiles_employee_fk foreign key (employee_id) references public.employees(id) on delete set null,
  add constraint profiles_role_target_check check (
    (role = 'cliente' and client_id is not null and employee_id is null)
    or (role = 'funcionario' and employee_id is not null and client_id is null)
    or (role = 'supervisor')
    or (client_id is null and employee_id is null)
  );

create table public.escorts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  data_escolta date not null,
  hora_carregamento time not null,
  local_carregamento text not null,
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
  constraint escorts_alternative_required check (encontro_alternativo_permitido = false or nullif(trim(local_alternativo_encontro), '') is not null)
);

create table public.escort_team (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  position smallint not null check (position in (1, 2)),
  assigned_at timestamptz not null default now(),
  unique (escort_id, employee_id),
  unique (escort_id, position)
);

create table public.escort_locations (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  accuracy_meters numeric(8, 2),
  recorded_at timestamptz not null default now()
);

create table public.escort_photos (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  url text not null,
  storage_path text not null unique,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.escort_status_history (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  old_status public.escort_status,
  new_status public.escort_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.financial_clients (
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

create table public.financial_employees (
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

create table public.extra_expenses (
  id uuid primary key default gen_random_uuid(),
  escort_id uuid not null references public.escorts(id) on delete cascade,
  categoria public.extra_expense_category not null,
  valor numeric(12, 2) not null check (valor >= 0),
  observacao text,
  receipt_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
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

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger clients_touch_updated_at before update on public.clients for each row execute function public.touch_updated_at();
create trigger employees_touch_updated_at before update on public.employees for each row execute function public.touch_updated_at();
create trigger escorts_touch_updated_at before update on public.escorts for each row execute function public.touch_updated_at();
create trigger financial_clients_touch_updated_at before update on public.financial_clients for each row execute function public.touch_updated_at();
create trigger financial_employees_touch_updated_at before update on public.financial_employees for each row execute function public.touch_updated_at();

create or replace function public.current_profile_id() returns uuid language sql stable security definer set search_path = public as $$ select id from public.profiles where user_id = auth.uid() $$;
create or replace function public.current_role() returns public.user_role language sql stable security definer set search_path = public as $$ select role from public.profiles where user_id = auth.uid() $$;
create or replace function public.current_client_id() returns uuid language sql stable security definer set search_path = public as $$ select client_id from public.profiles where user_id = auth.uid() $$;
create or replace function public.current_employee_id() returns uuid language sql stable security definer set search_path = public as $$ select employee_id from public.profiles where user_id = auth.uid() $$;
create or replace function public.is_supervisor() returns boolean language sql stable security definer set search_path = public as $$ select coalesce(public.current_role() = 'supervisor', false) $$;

create or replace function public.validate_escort_team_size() returns trigger language plpgsql as $$
declare
  team_count integer;
  target_escort_id uuid;
begin
  target_escort_id := coalesce(new.escort_id, old.escort_id);
  select count(*) into team_count from public.escort_team where escort_id = target_escort_id;
  if team_count <> 2 then raise exception 'Cada escolta deve possuir exatamente 2 funcionários'; end if;
  return null;
end;
$$;

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
      and existing_escort.status <> 'Cancelada'
      and new_start < existing_escort.scheduled_end
      and new_end > (existing_escort.data_escolta + existing_escort.hora_carregamento)::timestamptz
  ) into conflict_exists;
  if conflict_exists then raise exception 'Funcionário já está em outra escolta no mesmo horário'; end if;
  return new;
end;
$$;

create trigger escort_team_prevent_conflict before insert or update on public.escort_team for each row execute function public.prevent_employee_schedule_conflict();

create or replace function public.record_status_history() returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into public.escort_status_history (escort_id, old_status, new_status, changed_by) values (new.id, old.status, new.status, public.current_profile_id());
  end if;
  return new;
end;
$$;

create trigger escorts_record_status_history after update of status on public.escorts for each row execute function public.record_status_history();

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

create trigger escorts_update_financial_excess after update of inicio_real, fim_real on public.escorts for each row execute function public.update_financial_client_excess();

create or replace function public.create_escort_with_team(
  p_client_id uuid,
  p_data_escolta date,
  p_hora_carregamento time,
  p_local_carregamento text,
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
  if p_employee_1 = p_employee_2 then raise exception 'A equipe deve possuir exatamente 2 funcionários distintos'; end if;
  if p_encontro_alternativo_permitido and nullif(trim(coalesce(p_local_alternativo_encontro, '')), '') is null then raise exception 'Informe o local alternativo de encontro'; end if;
  v_start := (p_data_escolta + p_hora_carregamento)::timestamptz;
  v_end := v_start + interval '24 hours';
  if exists (
    select 1 from public.escort_team team
    join public.escorts escort on escort.id = team.escort_id
    where team.employee_id in (p_employee_1, p_employee_2)
      and escort.status <> 'Cancelada'
      and v_start < escort.scheduled_end
      and v_end > (escort.data_escolta + escort.hora_carregamento)::timestamptz
  ) then raise exception 'Funcionário já está em outra escolta no mesmo horário'; end if;
  insert into public.escorts (client_id, data_escolta, hora_carregamento, local_carregamento, observacao_operacional, encontro_alternativo_permitido, local_alternativo_encontro, scheduled_end, created_by)
  values (p_client_id, p_data_escolta, p_hora_carregamento, p_local_carregamento, p_observacao_operacional, p_encontro_alternativo_permitido, p_local_alternativo_encontro, v_end, public.current_profile_id()) returning id into v_escort_id;
  insert into public.escort_team (escort_id, employee_id, position) values (v_escort_id, p_employee_1, 1), (v_escort_id, p_employee_2, 2);
  insert into public.financial_clients (escort_id, valor_base) values (v_escort_id, p_valor_base);
  insert into public.financial_employees (escort_id, employee_id) values (v_escort_id, p_employee_1), (v_escort_id, p_employee_2);
  insert into public.notifications (escort_id, user_id, canal, target_role, mensagem)
  select v_escort_id, profiles.user_id, 'Interna', profiles.role, 'Nova escolta agendada' from public.profiles where profiles.client_id = p_client_id or profiles.employee_id in (p_employee_1, p_employee_2);
  return v_escort_id;
end;
$$;

create index profiles_user_idx on public.profiles (user_id);
create index profiles_role_idx on public.profiles (role);
create index clients_profile_idx on public.clients (profile_id);
create index employees_status_idx on public.employees (status);
create index escorts_client_date_idx on public.escorts (client_id, data_escolta desc);
create index escorts_status_date_idx on public.escorts (status, data_escolta desc);
create index escort_team_employee_idx on public.escort_team (employee_id, escort_id);
create index escort_locations_live_idx on public.escort_locations (escort_id, recorded_at desc);
create index escort_photos_escort_idx on public.escort_photos (escort_id, taken_at desc);
create index financial_clients_status_idx on public.financial_clients (status_pagamento);
create index financial_employees_status_idx on public.financial_employees (status_pagamento);
create index extra_expenses_escort_idx on public.extra_expenses (escort_id);
create index notifications_user_idx on public.notifications (user_id, read_at);

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
alter table public.extra_expenses enable row level security;
alter table public.notifications enable row level security;

create policy "supervisor total profiles" on public.profiles for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "usuario ve proprio profile" on public.profiles for select using (user_id = auth.uid());
create policy "usuario atualiza proprio profile" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "supervisor total clients" on public.clients for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve seu cadastro" on public.clients for select using (id = public.current_client_id());
create policy "supervisor total employees" on public.employees for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "funcionario ve seu cadastro" on public.employees for select using (id = public.current_employee_id());
create policy "supervisor total escorts" on public.escorts for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve suas escorts" on public.escorts for select using (client_id = public.current_client_id());
create policy "cliente reagenda cancela suas escorts" on public.escorts for update using (client_id = public.current_client_id()) with check (client_id = public.current_client_id());
create policy "funcionario ve missoes" on public.escorts for select using (exists (select 1 from public.escort_team team where team.escort_id = escorts.id and team.employee_id = public.current_employee_id()));
create policy "funcionario atualiza missoes" on public.escorts for update using (exists (select 1 from public.escort_team team where team.escort_id = escorts.id and team.employee_id = public.current_employee_id())) with check (exists (select 1 from public.escort_team team where team.escort_id = escorts.id and team.employee_id = public.current_employee_id()));
create policy "supervisor total escort_team" on public.escort_team for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve equipe das suas escorts" on public.escort_team for select using (exists (select 1 from public.escorts escort where escort.id = escort_team.escort_id and escort.client_id = public.current_client_id()));
create policy "funcionario ve propria equipe" on public.escort_team for select using (employee_id = public.current_employee_id());
create policy "supervisor total locations" on public.escort_locations for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve localizacoes das suas escorts" on public.escort_locations for select using (exists (select 1 from public.escorts escort where escort.id = escort_locations.escort_id and escort.client_id = public.current_client_id()));
create policy "funcionario ve suas localizacoes" on public.escort_locations for select using (employee_id = public.current_employee_id());
create policy "funcionario envia sua localizacao" on public.escort_locations for insert with check (employee_id = public.current_employee_id() and exists (select 1 from public.escort_team team where team.escort_id = escort_locations.escort_id and team.employee_id = public.current_employee_id()));
create policy "supervisor total photos" on public.escort_photos for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve fotos das suas escorts" on public.escort_photos for select using (exists (select 1 from public.escorts escort where escort.id = escort_photos.escort_id and escort.client_id = public.current_client_id()));
create policy "funcionario ve suas fotos" on public.escort_photos for select using (employee_id = public.current_employee_id());
create policy "funcionario envia suas fotos" on public.escort_photos for insert with check (employee_id = public.current_employee_id() and exists (select 1 from public.escort_team team where team.escort_id = escort_photos.escort_id and team.employee_id = public.current_employee_id()));
create policy "supervisor ve historico" on public.escort_status_history for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve historico das suas escorts" on public.escort_status_history for select using (exists (select 1 from public.escorts escort where escort.id = escort_status_history.escort_id and escort.client_id = public.current_client_id()));
create policy "funcionario ve historico das suas escorts" on public.escort_status_history for select using (exists (select 1 from public.escort_team team where team.escort_id = escort_status_history.escort_id and team.employee_id = public.current_employee_id()));
create policy "supervisor total financial_clients" on public.financial_clients for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve seus pagamentos" on public.financial_clients for select using (exists (select 1 from public.escorts escort where escort.id = financial_clients.escort_id and escort.client_id = public.current_client_id()));
create policy "supervisor total financial_employees" on public.financial_employees for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "funcionario ve seus pagamentos" on public.financial_employees for select using (employee_id = public.current_employee_id());
create policy "supervisor total expenses" on public.extra_expenses for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "cliente ve gastos das suas escorts" on public.extra_expenses for select using (exists (select 1 from public.escorts escort where escort.id = extra_expenses.escort_id and escort.client_id = public.current_client_id()));
create policy "funcionario ve gastos das suas escorts" on public.extra_expenses for select using (exists (select 1 from public.escort_team team where team.escort_id = extra_expenses.escort_id and team.employee_id = public.current_employee_id()));
create policy "supervisor total notifications" on public.notifications for all using (public.is_supervisor()) with check (public.is_supervisor());
create policy "usuario ve notificacoes proprias" on public.notifications for select using (user_id = auth.uid());
create policy "usuario marca notificacao propria" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "supervisor gerencia storage fotos" on storage.objects for all using (bucket_id = 'escort-photos' and public.is_supervisor()) with check (bucket_id = 'escort-photos' and public.is_supervisor());
create policy "funcionario envia storage fotos" on storage.objects for insert with check (bucket_id = 'escort-photos' and public.current_role() = 'funcionario');
create policy "usuarios autenticados leem storage fotos" on storage.objects for select using (bucket_id = 'escort-photos' and auth.uid() is not null);

do $$ begin alter publication supabase_realtime add table public.escort_locations; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;