-- FKs
ALTER TABLE "vendas_produtos"
  ADD CONSTRAINT "vendas_produtos_produto_id_fk"
  FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "vendas_produtos"
  ADD CONSTRAINT "vendas_produtos_barbeiro_id_fk"
  FOREIGN KEY ("barbeiro_id") REFERENCES "barbeiros"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "vendas_produtos"
  ADD CONSTRAINT "vendas_produtos_cliente_id_fk"
  FOREIGN KEY ("cliente_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- Índice para consultas por período.
CREATE INDEX "vendas_produtos_data_idx" ON "vendas_produtos" ("data_hora");
--> statement-breakpoint

-- RLS: dados administrativos. Leitura/escrita só no servidor (role postgres, ignora RLS).
ALTER TABLE "vendas_produtos" ENABLE ROW LEVEL SECURITY;
