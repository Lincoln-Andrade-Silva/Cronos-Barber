CREATE TABLE "vendas_produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produto_id" uuid NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"valor_unitario" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"barbeiro_id" uuid NOT NULL,
	"cliente_id" uuid,
	"data_hora" timestamp with time zone DEFAULT now() NOT NULL
);
