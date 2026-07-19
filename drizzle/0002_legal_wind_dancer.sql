CREATE TABLE "barbearia_info" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome" text,
	"logo_url" text,
	"horario_atendimento" text,
	"endereco" text,
	"whatsapp" text,
	"instagram_link" text,
	"facebook_link" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
