-- FKs
ALTER TABLE "agendamentos"
  ADD CONSTRAINT "agendamentos_cliente_id_fk"
  FOREIGN KEY ("cliente_id") REFERENCES "profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "agendamentos"
  ADD CONSTRAINT "agendamentos_barbeiro_id_fk"
  FOREIGN KEY ("barbeiro_id") REFERENCES "barbeiros"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "agendamentos"
  ADD CONSTRAINT "agendamentos_servico_id_fk"
  FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "expediente"
  ADD CONSTRAINT "expediente_barbeiro_id_fk"
  FOREIGN KEY ("barbeiro_id") REFERENCES "barbeiros"("id") ON DELETE CASCADE;
--> statement-breakpoint

-- Índice para consulta de disponibilidade (agendamentos do barbeiro por período).
CREATE INDEX "agendamentos_barbeiro_data_idx"
  ON "agendamentos" ("barbeiro_id", "data_hora");
--> statement-breakpoint

-- RLS: cliente enxerga e cria apenas os próprios agendamentos.
-- Escritas do admin ocorrem no servidor (role postgres, ignora RLS).
ALTER TABLE "agendamentos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON "agendamentos" TO authenticated;
--> statement-breakpoint
CREATE POLICY "agendamentos_select_own" ON "agendamentos"
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = "cliente_id");
--> statement-breakpoint
CREATE POLICY "agendamentos_insert_own" ON "agendamentos"
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = "cliente_id");
--> statement-breakpoint

-- Expediente: leitura liberada para autenticados (usado no fluxo de agendamento).
ALTER TABLE "expediente" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON "expediente" TO authenticated;
--> statement-breakpoint
CREATE POLICY "expediente_select_authenticated" ON "expediente"
  FOR SELECT TO authenticated
  USING (true);
