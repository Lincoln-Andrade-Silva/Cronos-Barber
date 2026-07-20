ALTER TABLE "planos" ADD COLUMN "valor" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "plano_servicos" DROP COLUMN "valor";