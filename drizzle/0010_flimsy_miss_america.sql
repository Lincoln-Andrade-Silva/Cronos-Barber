CREATE TYPE "public"."status_agendamento" AS ENUM('agendado', 'finalizado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_agendamento" AS ENUM('avulso', 'plano');--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"barbeiro_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	"data_hora" timestamp with time zone NOT NULL,
	"status" "status_agendamento" DEFAULT 'agendado' NOT NULL,
	"tipo" "tipo_agendamento" DEFAULT 'avulso' NOT NULL,
	"valor" numeric(10, 2) DEFAULT '0' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expediente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbeiro_id" uuid NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora_inicio" text NOT NULL,
	"hora_fim" text NOT NULL,
	"almoco_inicio" text,
	"almoco_fim" text
);
