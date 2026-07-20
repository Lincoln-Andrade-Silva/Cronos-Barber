CREATE TABLE "barbeiros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"foto_url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"comissao_percentual" numeric(5, 2) DEFAULT '0' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
