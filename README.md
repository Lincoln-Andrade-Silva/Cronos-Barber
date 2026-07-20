# Cronos Barber

Sistema de agendamento e gestão para barbearia: login, agenda, painel admin (dashboard, financeiro, relatórios, serviços/produtos, assinaturas e configurações).

Construído como **template reutilizável**: modelo **1 barbearia por deploy** (cada cliente = novo projeto Vercel + novo Supabase, mesmo código). A identidade da barbearia (nome, logo, contatos) é configurável dentro do sistema, sem mexer em código.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict): frontend + API (Route Handlers)
- **TailwindCSS**: tema escuro (fundo quase preto + acento azul), mobile-first
- **Drizzle ORM** + **Supabase** (Postgres, Auth, Storage)
- **lucide-react**: ícones
- **Deploy**: Vercel + Supabase (free tier)

## Setup

```bash
npm install
cp .env.example .env    # preencha as credenciais do Supabase
npm run db:check        # testa a conexão com o Postgres
npm run db:migrate      # cria as tabelas, RLS e triggers
npm run seed:admin      # cria o admin padrão (admin@barbearia.com / 123456)
npm run dev             # http://localhost:3000
```

> Primeiro passo ao reimplantar para um novo cliente: rodar o seed e **trocar a senha do admin**.

### Variáveis de ambiente

Ver `.env.example`. Resumo:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Postgres do Supabase (runtime: Transaction Pooler; migrations: conexão direta) |
| `DIRECT_URL` | Conexão direta para migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (server-only), usada no registro e no seed |

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:check` | Testa conexão com o Postgres |
| `npm run db:generate` | Gera migrations a partir do schema Drizzle |
| `npm run db:migrate` | Aplica migrations |
| `npm run seed:admin` | Cria o admin padrão |
| `npm run setup:storage` | Cria o bucket público de imagens no Supabase Storage |
| `npm run db:studio` | Drizzle Studio |

## Autenticação

- Supabase Auth (email + senha) via `@supabase/ssr`, com cookies SSR.
- Papéis em `profiles.tipo` (`admin` / `cliente`); proteção de rotas no middleware + gate por papel nos layouts.
- Registro cria o usuário já confirmado (via service_role), sem depender de SMTP.
- Admin padrão: `admin@barbearia.com` / `123456`.

## Padrões de UI (design system)

Componentes reutilizáveis em `src/components/ui` (fonte única de estilo):

- `Button` (variantes: primary, secondary, ghost, danger), `Input`, `Textarea`, `Field`, `Label`, `FormError`, `FormSuccess`
- `Card`, `PageHeader`, `Badge`, `Toggle`, `Segmented`, `Select` (dropdown custom)
- `Modal`, `ConfirmModal`, `ImageUpload`, `TabBar`
- `DataTable` (TanStack): busca + slots `filter`/`actions` + paginação, base de toda listagem (ver `src/features/barbeiros`)

O menu lateral do admin fica em `src/components/admin/admin-shell.tsx` (responsivo, drawer no mobile), dividido por seções (`src/lib/admin-nav.ts`). Tokens de cor semânticos (`bg`, `panel`, `surface`, `line`, `ink`, `muted`, `brand`) em `tailwind.config.ts`.

A marca exibida (login, sidebar, home) vem de `getBarbeariaNome()` (`src/lib/barbearia.ts`), lida da tabela `barbearia_info`, com fallback `Cronos Barber`. Editável em Configurações > Barbearia (Fase 2).

## Roadmap (fases)

- [x] **Fase 0**: Setup (Next.js, Tailwind, Drizzle, Supabase conectado)
- [x] **Fase 1**: Auth (registro/login, `profiles` com tipo/status, proteção de rotas, seed admin, design system base)
- [x] **Fase 2**: Cadastros base (Barbeiros, Serviços, Produtos em `/admin/cadastros`; Config. Barbearia com logo/horário/endereço; Home do cliente)
- [ ] **Fase 3**: Agendamento (fluxo do cliente + conflito de horário + expediente)
- [ ] **Fase 4**: Histórico do cliente
- [ ] **Fase 5**: Financeiro básico (faturamento do dia)
- [ ] **Fase 6**: Planos e Assinaturas
- [ ] **Fase 7**: Vendas de Produtos
- [ ] **Fase 8**: Comissão
- [ ] **Fase 9**: Dashboard (cards + gráficos)
- [ ] **Fase 10**: Relatórios
- [ ] **Fase 11**: Gestão (atendimentos, produtos, vendas)
- [ ] **Fase 12**: Configurações (Usuários, Expediente)
- [ ] **Fase 13**: Deploy (Vercel + Supabase + domínio)
- [ ] **Fase 14**: Checklist de reuso do template
