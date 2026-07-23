# Chronoss

Sistema de agendamento e gestão para estabelecimento: login, agenda, painel admin (dashboard, financeiro, relatórios, serviços/produtos, assinaturas e configurações).

Construído como **template reutilizável**: modelo **1 estabelecimento por deploy** (cada cliente = novo projeto Vercel + novo Supabase, mesmo código). A identidade do estabelecimento (nome, logo, contatos) é configurável dentro do sistema, sem mexer em código.

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
npm run seed:admin      # cria o admin padrão (admin@chronoss.com / 123456)
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
- Admin padrão: `admin@chronoss.com` / `123456`.

## Padrões de UI (design system)

Componentes reutilizáveis em `src/components/ui` (fonte única de estilo):

- `Button` (variantes: primary, secondary, ghost, danger), `Input`, `Textarea`, `Field`, `Label`, `FormError`, `FormSuccess`
- `Card`, `PageHeader`, `Badge`, `Toggle`, `Segmented`, `Select` (dropdown custom)
- `Modal`, `ConfirmModal`, `ImageUpload`, `TabBar`
- `DataTable` (TanStack): busca + slots `filter`/`actions` + paginação, base de toda listagem (ver `src/features/barbeiros`)

O menu lateral do admin fica em `src/components/admin/admin-shell.tsx` (responsivo, drawer no mobile), dividido por seções (`src/lib/admin-nav.ts`). Tokens de cor semânticos (`bg`, `panel`, `surface`, `line`, `ink`, `muted`, `brand`) em `tailwind.config.ts`.

A marca exibida (login, sidebar, home) vem de `getEstabelecimentoNome()` (`src/lib/estabelecimento.ts`), lida da tabela `estabelecimento_info`, com fallback `Chronoss`. Editável em Configurações > Estabelecimento (Fase 2).

## Roadmap (fases)

- [x] **Fase 0**: Setup (Next.js, Tailwind, Drizzle, Supabase conectado)
- [x] **Fase 1**: Auth (registro/login, `profiles` com tipo/status, proteção de rotas, seed admin, design system base)
- [x] **Fase 2**: Cadastros base (Serviços, Produtos, Config. Estabelecimento com logo/horário/endereço; Home do cliente)
- [x] **Fase 3**: Agendamento (fluxo do cliente + conflito de horário + expediente por barbeiro)
- [x] **Fase 4**: Histórico do cliente
- [x] **Fase 5**: Financeiro básico (faturamento do dia)
- [x] **Fase 6**: Planos e Assinaturas (cobertura no agendamento: dias válidos + limite de usos)
- [x] **Fase 7**: Vendas de Produtos
- [x] **Fase 8**: Comissão
- [x] **Fase 9**: Dashboard (KPIs + gráficos + rankings, com filtro por período)
- [x] **Fase 10**: Relatórios (painéis Financeiro, Atendimentos, Comissões, Assinaturas e Produtos, com filtro por período e gráficos)
- [ ] **Fase 11**: Gestão (atendimentos, produtos, vendas)
- [ ] **Fase 12**: Configurações — [x] Expediente por barbeiro · [x] Usuários (CRUD em Cadastros)
- [ ] **Fase 13**: Deploy (Vercel + Supabase + domínio)
- [ ] **Fase 14**: Checklist de reuso do template

> Menu do admin: Visão geral (Dashboard, Relatórios), Operação (Agenda, Vendas, Assinaturas), Financeiro (Fluxo de caixa), Gestão (Funcionários, Cadastros) e Sistema (Configurações).

> Agendamento suporta **múltiplos serviços por marcação**: os serviços viram linhas sequenciais compartilhando um `grupo_id`; finalizar/cancelar/excluir agem no grupo.

## Recursos

- **Bloqueio de cliente**: admin bloqueia um cliente com motivo e prazo opcional (vazio = permanente). Não impede login, mas trava agendar e contratar planos (cancelar plano existente segue liberado); ao tentar, o cliente recebe a mensagem com motivo e prazo. Estado atual em `profiles` (enforcement rápido) + trilha em `bloqueios`.
- **Finalização de atendimento**: ao finalizar na agenda, um modal permite adicionar serviços extras (cobertura de plano reavaliada), registrar produtos vendidos e escolher o **método de pagamento** (Dinheiro/Pix/Débito/Crédito). Reflete em agenda, vendas, dashboard e relatórios ("Recebimentos por método").
- **Fluxo de caixa** (`/admin/caixa`): visão consolidada por período — entradas automáticas (serviços finalizados, produtos, assinaturas iniciadas), saídas automáticas (estornos) e **lançamentos manuais** de entrada/saída (despesas, retiradas, aportes) com CRUD, em KPIs de Entradas/Saídas/Saldo.
- **Média de frequência**: intervalo médio entre visitas dos clientes (a partir dos atendimentos finalizados), exibido na listagem de usuários, no dashboard e no relatório de Atendimentos.
