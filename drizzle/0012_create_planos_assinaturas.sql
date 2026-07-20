CREATE TYPE "public"."status_assinatura" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"plano_id" uuid NOT NULL,
	"data_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "status_assinatura" DEFAULT 'ativo' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_servicos" (
	"plano_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	CONSTRAINT "plano_servicos_plano_id_servico_id_pk" PRIMARY KEY("plano_id","servico_id")
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"dias_validade" integer DEFAULT 30 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
