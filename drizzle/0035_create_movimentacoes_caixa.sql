CREATE TABLE "movimentacoes_caixa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- FK do autor do lançamento.
ALTER TABLE "movimentacoes_caixa"
  ADD CONSTRAINT "movimentacoes_caixa_criado_por_id_fk"
  FOREIGN KEY ("criado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- Índice para consultas por período.
CREATE INDEX "movimentacoes_caixa_data_idx" ON "movimentacoes_caixa" ("data");
--> statement-breakpoint

-- RLS: dados administrativos. Leitura/escrita só no servidor (role postgres, ignora RLS).
ALTER TABLE "movimentacoes_caixa" ENABLE ROW LEVEL SECURITY;
