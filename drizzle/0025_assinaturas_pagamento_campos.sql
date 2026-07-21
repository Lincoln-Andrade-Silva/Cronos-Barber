ALTER TABLE "assinaturas" ADD COLUMN "gratuito" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "metodo" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "gateway_assinatura_id" text;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "proxima_cobranca" timestamp with time zone;