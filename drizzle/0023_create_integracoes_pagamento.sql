CREATE TABLE "integracoes_pagamento" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"provedor" text DEFAULT 'mercadopago' NOT NULL,
	"access_token" text,
	"public_key" text,
	"webhook_secret" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "integracoes_pagamento" ENABLE ROW LEVEL SECURITY;
