import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tipoUsuario = pgEnum("tipo_usuario", ["admin", "cliente"]);
export const statusUsuario = pgEnum("status_usuario", ["ativo", "inativo"]);

// `profiles.id` referencia auth.users(id). A FK, a RLS e o trigger de criação
// automática ficam na migration custom (Drizzle não modela o schema `auth`).
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  tipo: tipoUsuario("tipo").notNull().default("cliente"),
  status: statusUsuario("status").notNull().default("ativo"),
  // Bloqueio: impede agendar/assinar (mas não o login). Null = sem bloqueio.
  // `bloqueioDias` null enquanto bloqueado = permanente; passado o prazo, expira sozinho.
  bloqueadoEm: timestamp("bloqueado_em", { withTimezone: true }),
  bloqueioDias: integer("bloqueio_dias"),
  bloqueioMotivo: text("bloqueio_motivo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NovoProfile = typeof profiles.$inferInsert;

// Histórico de bloqueios: um registro por episódio. As colunas de estado atual em
// `profiles` refletem sempre o último episódio ativo (enforcement rápido); esta tabela
// guarda a trilha completa. `desbloqueadoEm` null = ainda vigente.
export const bloqueios = pgTable("bloqueios", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").notNull(),
  motivo: text("motivo").notNull(),
  dias: integer("dias"),
  bloqueadoEm: timestamp("bloqueado_em", { withTimezone: true }).notNull().defaultNow(),
  desbloqueadoEm: timestamp("desbloqueado_em", { withTimezone: true }),
  criadoPorId: uuid("criado_por_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Bloqueio = typeof bloqueios.$inferSelect;

// Horário de atendimento por dia da semana (0 = domingo ... 6 = sábado).
export interface HorarioDia {
  dia: number;
  aberto: boolean;
  abre: string;
  fecha: string;
}

// Identidade do estabelecimento (linha única, id sempre = 1). Editável em Configurações.
export const estabelecimentoInfo = pgTable("estabelecimento_info", {
  id: integer("id").primaryKey().default(1),
  nome: text("nome"),
  logoUrl: text("logo_url"),
  whatsapp: text("whatsapp"),
  instagramLink: text("instagram_link"),
  facebookLink: text("facebook_link"),
  enderecoRua: text("endereco_rua"),
  enderecoNumero: text("endereco_numero"),
  enderecoBairro: text("endereco_bairro"),
  enderecoCidade: text("endereco_cidade"),
  horario: jsonb("horario").$type<HorarioDia[]>(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type EstabelecimentoInfo = typeof estabelecimentoInfo.$inferSelect;

// Credenciais do gateway de pagamento (linha única, id = 1). Server-only: RLS travada,
// nunca consultada pelo client. O access_token é secreto — não expor.
export const integracoesPagamento = pgTable("integracoes_pagamento", {
  id: integer("id").primaryKey().default(1),
  provedor: text("provedor").notNull().default("mercadopago"),
  accessToken: text("access_token"),
  publicKey: text("public_key"),
  webhookSecret: text("webhook_secret"),
  // URL pública base do site (checkout/webhook). Ex: https://seudominio.com
  siteUrl: text("site_url"),
  // Taxa (%) que o gateway retém por venda no cartão. Usada para exibir o líquido dos planos.
  taxaCartao: numeric("taxa_cartao", { precision: 5, scale: 2 }).notNull().default("3.03"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type IntegracaoPagamento = typeof integracoesPagamento.$inferSelect;

export const barbeiros = pgTable("barbeiros", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  fotoUrl: text("foto_url"),
  ativo: boolean("ativo").notNull().default(true),
  comissaoPercentual: numeric("comissao_percentual", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Barbeiro = typeof barbeiros.$inferSelect;
export type NovoBarbeiro = typeof barbeiros.$inferInsert;

export const servicos = pgTable("servicos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull().default("0"),
  duracaoMinutos: integer("duracao_minutos").notNull().default(30),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Servico = typeof servicos.$inferSelect;

export const statusProduto = pgEnum("status_produto", ["ativo", "inativo"]);

export const produtos = pgTable("produtos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
  status: statusProduto("status").notNull().default("ativo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Produto = typeof produtos.$inferSelect;

export const statusAgendamento = pgEnum("status_agendamento", [
  "agendado",
  "finalizado",
  "cancelado",
  // Dinheiro devolvido: online estornado no gateway ou presencial devolvido em mãos. Não gera receita.
  "estornado",
]);
export const tipoAgendamento = pgEnum("tipo_agendamento", ["avulso", "plano"]);

export const agendamentos = pgTable("agendamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Null = atendimento avulso criado pelo admin para alguém sem cadastro (nome em clienteAvulso).
  clienteId: uuid("cliente_id"),
  clienteAvulso: text("cliente_avulso"),
  barbeiroId: uuid("barbeiro_id").notNull(),
  servicoId: uuid("servico_id").notNull(),
  // Agrupa vários serviços marcados numa mesma sessão (null = marcação avulsa de 1 serviço).
  grupoId: uuid("grupo_id"),
  dataHora: timestamp("data_hora", { withTimezone: true }).notNull(),
  status: statusAgendamento("status").notNull().default("agendado"),
  tipo: tipoAgendamento("tipo").notNull().default("avulso"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
  // Como o cliente paga: "presencial" (na hora) ou "online" (cartão via Mercado Pago).
  formaPagamento: text("forma_pagamento").notNull().default("presencial"),
  // Situação do pagamento: "a_receber" (presencial pendente), "pendente" (checkout iniciado),
  // "pago" (aprovado no gateway) ou "estornado" (devolvido).
  pagamentoStatus: text("pagamento_status").notNull().default("a_receber"),
  // Instrumento do recebimento presencial: dinheiro/pix/debito/credito. Null = não informado ou online.
  metodoPagamento: text("metodo_pagamento"),
  // Id do pagamento no Mercado Pago (necessário para estorno). Null quando presencial.
  gatewayPagamentoId: text("gateway_pagamento_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Agendamento = typeof agendamentos.$inferSelect;

export const expediente = pgTable("expediente", {
  id: uuid("id").primaryKey().defaultRandom(),
  barbeiroId: uuid("barbeiro_id").notNull(),
  diaSemana: integer("dia_semana").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  almocoInicio: text("almoco_inicio"),
  almocoFim: text("almoco_fim"),
});

export type Expediente = typeof expediente.$inferSelect;

export const planos = pgTable("planos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
  // Frequência da cobrança recorrente: "semanal" ou "mensal".
  periodicidade: text("periodicidade").notNull().default("mensal"),
  // Dias da semana (0=domingo ... 6=sábado) em que o plano cobre os serviços.
  // Fora desses dias, o atendimento é cobrado avulso.
  diasValidos: jsonb("dias_validos").$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Plano = typeof planos.$inferSelect;

// N:N entre planos e serviços inclusos (cobertos pela assinatura).
// `limite` = usos por período do plano; null = ilimitado. Estourou o limite = avulso.
export const planoServicos = pgTable(
  "plano_servicos",
  {
    planoId: uuid("plano_id").notNull(),
    servicoId: uuid("servico_id").notNull(),
    limite: integer("limite"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.planoId, t.servicoId] }) }),
);

export type PlanoServico = typeof planoServicos.$inferSelect;

export const statusAssinatura = pgEnum("status_assinatura", ["ativo", "inativo"]);

export const assinaturas = pgTable("assinaturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").notNull(),
  planoId: uuid("plano_id").notNull(),
  dataInicio: timestamp("data_inicio", { withTimezone: true }).notNull().defaultNow(),
  status: statusAssinatura("status").notNull().default("ativo"),
  // Vínculo manual (cortesia) = sem cobrança. Comprado = pago via gateway.
  gratuito: boolean("gratuito").notNull().default(false),
  metodo: text("metodo").notNull().default("manual"),
  gatewayAssinaturaId: text("gateway_assinatura_id"),
  proximaCobranca: timestamp("proxima_cobranca", { withTimezone: true }),
  // Marcada quando a cobrança recorrente falhou e o plano foi cancelado por isso.
  falhaPagamento: boolean("falha_pagamento").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Assinatura = typeof assinaturas.$inferSelect;

export const vendasProdutos = pgTable("vendas_produtos", {
  id: uuid("id").primaryKey().defaultRandom(),
  produtoId: uuid("produto_id").notNull(),
  quantidade: integer("quantidade").notNull().default(1),
  valorUnitario: numeric("valor_unitario", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  barbeiroId: uuid("barbeiro_id").notNull(),
  clienteId: uuid("cliente_id"),
  clienteAvulso: text("cliente_avulso"),
  // Instrumento do recebimento: dinheiro/pix/debito/credito. Null = não informado.
  metodoPagamento: text("metodo_pagamento"),
  dataHora: timestamp("data_hora", { withTimezone: true }).notNull().defaultNow(),
});

export type VendaProduto = typeof vendasProdutos.$inferSelect;

// Lançamentos manuais do fluxo de caixa (despesas, retiradas, aportes...). As entradas
// automáticas (serviços, produtos, assinaturas, estornos) são derivadas na leitura, não gravadas aqui.
export const movimentacoesCaixa = pgTable("movimentacoes_caixa", {
  id: uuid("id").primaryKey().defaultRandom(),
  // "entrada" (dinheiro que entra) ou "saida" (dinheiro que sai).
  tipo: text("tipo").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  data: timestamp("data", { withTimezone: true }).notNull().defaultNow(),
  criadoPorId: uuid("criado_por_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type MovimentacaoCaixa = typeof movimentacoesCaixa.$inferSelect;
