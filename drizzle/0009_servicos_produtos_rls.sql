-- Escritas só no servidor (role postgres, ignora RLS). Leitura liberada para
-- clientes autenticados (catálogo de serviços/produtos no agendamento).
ALTER TABLE "servicos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON "servicos" TO authenticated;
--> statement-breakpoint
CREATE POLICY "servicos_select_authenticated" ON "servicos"
  FOR SELECT TO authenticated
  USING (true);
--> statement-breakpoint

ALTER TABLE "produtos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON "produtos" TO authenticated;
--> statement-breakpoint
CREATE POLICY "produtos_select_authenticated" ON "produtos"
  FOR SELECT TO authenticated
  USING (true);
