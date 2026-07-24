CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "categoria_id" uuid;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "ordem" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Serviço aponta para a categoria; se a categoria for excluída, o serviço fica sem categoria.
ALTER TABLE "servicos"
  ADD CONSTRAINT "servicos_categoria_id_fk"
  FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- RLS: dados administrativos. Leitura/escrita só no servidor (role postgres, ignora RLS).
ALTER TABLE "categorias" ENABLE ROW LEVEL SECURITY;
