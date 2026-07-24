ALTER TABLE "vendas_produtos" ADD COLUMN "agendamento_id" uuid;--> statement-breakpoint

-- Venda vinculada ao atendimento (modal de finalização). Null = venda avulsa.
-- Se o atendimento for excluído, a venda permanece e passa a contar como avulsa.
ALTER TABLE "vendas_produtos"
  ADD CONSTRAINT "vendas_produtos_agendamento_id_fk"
  FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE SET NULL;
