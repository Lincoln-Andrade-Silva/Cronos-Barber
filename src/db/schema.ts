import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
