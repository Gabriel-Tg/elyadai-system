# Elyadai Serviços

Sistema web modular para gestão de escoltas armadas, com autenticação por perfil, operação de agendamentos, rastreamento em tempo real, upload de fotos, financeiro e relatórios.

## Stack

- Next.js 16 com App Router
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, Row Level Security, Realtime e Storage
- Lucide React para iconografia

## Estrutura principal

- `src/app/login/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/clientes/page.tsx`
- `src/app/clientes/[id]/page.tsx`
- `src/app/funcionarios/page.tsx`
- `src/app/funcionarios/[id]/page.tsx`
- `src/app/agendamentos/page.tsx`
- `src/app/agendamentos/novo/page.tsx`
- `src/app/agendamentos/[id]/page.tsx`
- `src/app/financeiro/page.tsx`
- `src/app/relatorios/page.tsx`
- `src/app/cliente/dashboard/page.tsx`
- `src/app/funcionario/dashboard/page.tsx`

## Camadas

- `src/lib/supabase.ts`: client Supabase para browser e Realtime.
- `src/lib/supabase-server.ts`: clients server/admin do Supabase.
- `src/lib/auth.ts`: leitura e proteção de perfil autenticado.
- `src/lib/permissions.ts`: mapa de permissões e redirecionamento por papel.
- `middleware.ts`: renovação de sessão e proteção de rotas.
- `src/services`: queries e Server Actions reais.
- `src/components`: navegação, cards, forms, tables e mapa realtime.
- `src/types`: tipos de domínio.
- `src/validators`: validações de formulários.

## Banco de dados

Execute [supabase/schema.sql](supabase/schema.sql) no SQL Editor do Supabase. O arquivo cria:

- `profiles`
- `clients`
- `employees`
- `escorts`
- `escort_team`
- `escort_locations`
- `escort_photos`
- `escort_status_history`
- `financial_clients`
- `financial_employees`
- `extra_expenses`
- `notifications`

Também configura RLS em todas as tabelas, policies por papel, triggers de timestamps, histórico de status, cálculo automático de excedente, validação de equipe com exatamente 2 funcionários, bloqueio de conflito de horário, bucket `escort-photos` e Realtime para `escort_locations`.

## Configuração local

Copie `.env.example` para `.env.local` e preencha:

```powershell
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-apenas-no-servidor
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Rode a aplicação:

```powershell
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Primeiro supervisor

Crie o usuário supervisor pelo painel do Supabase Auth. Depois insira o perfil correspondente no SQL Editor:

```sql
insert into public.profiles (user_id, nome, email, role)
values ('UUID_DO_AUTH_USER', 'Supervisor Elyadai', 'supervisor@elyadai.com', 'supervisor');
```

Com esse acesso, cadastre clientes e funcionários pela aplicação. Cada cadastro cria automaticamente um usuário Supabase Auth, senha inicial e `profile` com role `cliente` ou `funcionario`.

## Validação

```powershell
npm run lint
npm run build
```

## Observações de produção

- Rotas de WhatsApp ainda devem ser conectadas a um provedor real, como Meta Cloud API, Twilio ou Z-API.
- O mapa usa uma visualização própria com Realtime; para produção com mapa geográfico completo, conecte Mapbox, Google Maps ou Leaflet.
- A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ir para o browser. Ela é usada apenas em Server Actions para criar contas automaticamente.