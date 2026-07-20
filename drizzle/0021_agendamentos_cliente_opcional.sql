ALTER TABLE "agendamentos" ALTER COLUMN "cliente_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "cliente_avulso" text;