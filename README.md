# Cronos Barber

Sistema de agendamento e gestão para barbearia — login, agenda, painel admin (dashboard, financeiro, relatórios, serviços/produtos, assinaturas e configurações).

Construído como **template reutilizável**: modelo **1 barbearia por deploy** (cada cliente = novo projeto Vercel + novo Supabase, mesmo código). A identidade da barbearia (nome, logo, contatos) é configurável dentro do sistema, sem mexer em código.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict) — frontend + API (Route Handlers)
- **TailwindCSS** — tema azul escuro (navy), mobile-first
- **Drizzle ORM** + **Supabase** (Postgres, Auth, Storage)
- **Deploy:** Vercel + Supabase (free tier)

## Setup

```bash
npm install
cp .env.example .env   # preencha as credenciais do Supabase
npm run db:check       # testa a conexão com o Postgres
npm run dev            # http://localhost:3000
```

### Variáveis de ambiente

Ver `.env.example`. Resumo:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Postgres do Supabase (runtime: Transaction Pooler; migrations: conexão direta) |
| `DIRECT_URL` | Conexão direta para migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (server-only) — necessária a partir da Fase 1 |

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:check` | Testa conexão com o Postgres |
| `npm run db:generate` | Gera migrations a partir do schema Drizzle |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:push` | Sincroniza schema direto no banco (dev) |
| `npm run db:studio` | Drizzle Studio |

## Roadmap (fases)

- [x] **Fase 0** — Setup (Next.js, Tailwind, Drizzle, Supabase conectado)
- [ ] **Fase 1** — Auth (registro/login, `profiles` com tipo/status, proteção de rotas, seed admin)
- [ ] **Fase 2** — Cadastros base (Barbeiros, Serviços, Produtos, Config. Barbearia, Home do cliente)
- [ ] **Fase 3** — Agendamento (fluxo do cliente + conflito de horário + expediente)
- [ ] **Fase 4** — Histórico do cliente
- [ ] **Fase 5** — Financeiro básico (faturamento do dia)
- [ ] **Fase 6** — Planos e Assinaturas
- [ ] **Fase 7** — Vendas de Produtos
- [ ] **Fase 8** — Comissão
- [ ] **Fase 9** — Dashboard (cards + gráficos)
- [ ] **Fase 10** — Relatórios
- [ ] **Fase 11** — Gestão (atendimentos, produtos, vendas)
- [ ] **Fase 12** — Configurações (Usuários, Expediente)
- [ ] **Fase 13** — Deploy (Vercel + Supabase + domínio)
- [ ] **Fase 14** — Checklist de reuso do template
