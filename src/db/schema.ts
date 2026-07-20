import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
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
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NovoProfile = typeof profiles.$inferInsert;

// Horário de atendimento por dia da semana (0 = domingo ... 6 = sábado).
export interface HorarioDia {
  dia: number;
  aberto: boolean;
  abre: string;
  fecha: string;
}

// Identidade da barbearia (linha única, id sempre = 1). Editável em Configurações.
export const barbeariaInfo = pgTable("barbearia_info", {
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

export type BarbeariaInfo = typeof barbeariaInfo.$inferSelect;

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
