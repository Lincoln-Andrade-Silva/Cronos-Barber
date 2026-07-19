-- Garante a linha única (id = 1) da identidade da barbearia.
INSERT INTO "barbearia_info" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Info pública (nome, logo, contatos): leitura liberada para todos.
ALTER TABLE "barbearia_info" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

GRANT SELECT ON "barbearia_info" TO anon, authenticated;
--> statement-breakpoint

CREATE POLICY "barbearia_info_select_all" ON "barbearia_info"
  FOR SELECT TO anon, authenticated
  USING (true);
