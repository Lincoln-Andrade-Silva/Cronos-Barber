ALTER TABLE "planos" ALTER COLUMN "dias_validade" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "planos" ALTER COLUMN "dias_validade" DROP NOT NULL;