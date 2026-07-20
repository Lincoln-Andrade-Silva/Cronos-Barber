-- Escritas ocorrem só no servidor (role postgres, ignora RLS). A leitura por
-- clientes autenticados é liberada para o fluxo de agendamento (fase futura).
ALTER TABLE "barbeiros" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

GRANT SELECT ON "barbeiros" TO authenticated;
--> statement-breakpoint

CREATE POLICY "barbeiros_select_authenticated" ON "barbeiros"
  FOR SELECT TO authenticated
  USING (true);
