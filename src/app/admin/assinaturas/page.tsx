import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas, planos, profiles } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { PAGE_SIZE, offsetDaPagina, parsePagina, totalPaginas } from "@/lib/pagination";
import { AssinantesClient } from "@/features/assinaturas/assinantes-client";

export const dynamic = "force-dynamic";

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string };
}) {
  const pagina = parsePagina(searchParams.page);
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "todos";
  const offset = offsetDaPagina(pagina);

  const cond: (SQL | undefined)[] = [];
  if (q) cond.push(or(ilike(profiles.nome, `%${q}%`), ilike(profiles.email, `%${q}%`)));
  if (status === "ativos") cond.push(eq(assinaturas.status, "ativo"));
  if (status === "inativos") cond.push(eq(assinaturas.status, "inativo"));
  const where = cond.length ? and(...cond) : undefined;

  const [total, rows, clientes, opcoesPlanos] = await Promise.all([
    db
      .select({ n: count() })
      .from(assinaturas)
      .innerJoin(profiles, eq(assinaturas.clienteId, profiles.id))
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(where),
    db
      .select({
        id: assinaturas.id,
        clienteId: assinaturas.clienteId,
        clienteNome: profiles.nome,
        clienteEmail: profiles.email,
        dataInicio: assinaturas.dataInicio,
        planoId: assinaturas.planoId,
        planoNome: planos.nome,
        status: assinaturas.status,
      })
      .from(assinaturas)
      .innerJoin(profiles, eq(assinaturas.clienteId, profiles.id))
      .innerJoin(planos, eq(assinaturas.planoId, planos.id))
      .where(where)
      .orderBy(desc(assinaturas.dataInicio))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ id: profiles.id, nome: profiles.nome })
      .from(profiles)
      .where(eq(profiles.tipo, "cliente"))
      .orderBy(asc(profiles.nome)),
    db
      .select({ id: planos.id, nome: planos.nome })
      .from(planos)
      .where(eq(planos.ativo, true))
      .orderBy(asc(planos.nome)),
  ]);

  const assinantes = rows.map((r) => ({
    id: r.id,
    clienteId: r.clienteId,
    clienteNome: r.clienteNome,
    clienteEmail: r.clienteEmail,
    dataInicioISO: r.dataInicio.toISOString(),
    planoId: r.planoId,
    planoNome: r.planoNome,
    status: r.status,
  }));

  return (
    <div>
      <PageHeader title="Assinaturas" description="Clientes assinantes." />
      <AssinantesClient
        assinaturas={assinantes}
        clientes={clientes}
        planos={opcoesPlanos}
        page={pagina}
        pageCount={totalPaginas(total[0]?.n ?? 0)}
      />
    </div>
  );
}
