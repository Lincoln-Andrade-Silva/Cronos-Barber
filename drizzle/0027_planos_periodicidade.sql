ALTER TABLE "planos" ADD COLUMN "periodicidade" text DEFAULT 'mensal' NOT NULL;--> statement-breakpoint
ALTER TABLE "planos" DROP COLUMN "dias_validade";