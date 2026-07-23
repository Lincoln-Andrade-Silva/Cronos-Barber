import { and, asc, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, planoServicos, planos, produtos, profiles, servicos, vendasProdutos } from "@/db/schema";
import { PageHeader, UrlTabBar, type TabItem } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { diasDesde, frequenciaPorCliente, ultimaAtividadePorCliente } from "@/lib/frequencia";
import { getIntegracaoPagamento } from "@/lib/pagamento";
import { PAGE_SIZE, offsetDaPagina, parsePagina, totalPaginas } from "@/lib/pagination";
import { ServicosClient } from "@/features/servicos/servicos-client";
import { ProdutosClient } from "@/features/produtos/produtos-client";
import { PlanosClient } from "@/features/planos/planos-client";
import { UsuariosClient } from "@/features/usuarios/usuarios-client";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "servicos", label: "Serviços", ready: true },
  { key: "produtos", label: "Produtos", ready: true },
  { key: "planos", label: "Planos", ready: true },
  { key: "usuarios", label: "Usuários", ready: true },
] as const satisfies readonly TabItem[];

export default async function CadastrosPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string; status?: string };
}) {
  const tab = searchParams.tab ?? "servicos";
  const pagina = parsePagina(searchParams.page);
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? "todos";
  const offset = offsetDaPagina(pagina);

  let conteudo: React.ReactNode = null;

  if (tab === "produtos") {
    const cond: SQL[] = [];
    if (q) cond.push(ilike(produtos.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(produtos.status, "ativo"));
    if (status === "inativos") cond.push(eq(produtos.status, "inativo"));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows] = await Promise.all([
      db.select({ n: count() }).from(produtos).where(where),
      db.select().from(produtos).where(where).orderBy(asc(produtos.nome)).limit(PAGE_SIZE).offset(offset),
    ]);
    conteudo = (
      <ProdutosClient produtos={rows} page={pagina} pageCount={totalPaginas(total[0]?.n ?? 0)} />
    );
  } else if (tab === "planos") {
    const cond: SQL[] = [];
    if (q) cond.push(ilike(planos.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(planos.ativo, true));
    if (status === "inativos") cond.push(eq(planos.ativo, false));
    const where = cond.length ? and(...cond) : undefined;

    const [total, listaPlanos, listaServicos, cfgPagamento] = await Promise.all([
      db.select({ n: count() }).from(planos).where(where),
      db.select().from(planos).where(where).orderBy(asc(planos.nome)).limit(PAGE_SIZE).offset(offset),
      db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(asc(servicos.nome)),
      getIntegracaoPagamento(),
    ]);

    const ids = listaPlanos.map((p) => p.id);
    const vinculos = ids.length
      ? await db.select().from(planoServicos).where(inArray(planoServicos.planoId, ids))
      : [];

    const planosCompletos = listaPlanos.map((p) => ({
      id: p.id,
      nome: p.nome,
      valor: p.valor,
      diasValidos: p.diasValidos,
      ativo: p.ativo,
      servicos: vinculos
        .filter((v) => v.planoId === p.id)
        .map((v) => ({ servicoId: v.servicoId, limite: v.limite })),
    }));

    conteudo = (
      <PlanosClient
        planos={planosCompletos}
        servicos={listaServicos}
        taxaCartao={Number(cfgPagamento?.taxaCartao ?? "3.03")}
        page={pagina}
        pageCount={totalPaginas(total[0]?.n ?? 0)}
      />
    );
  } else if (tab === "usuarios") {
    const cond: SQL[] = [];
    if (q) cond.push(or(ilike(profiles.nome, `%${q}%`), ilike(profiles.email, `%${q}%`)) as SQL);
    if (status === "ativos") cond.push(eq(profiles.status, "ativo"));
    if (status === "inativos") cond.push(eq(profiles.status, "inativo"));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows, atual] = await Promise.all([
      db.select({ n: count() }).from(profiles).where(where),
      db
        .select({
          id: profiles.id,
          nome: profiles.nome,
          email: profiles.email,
          telefone: profiles.telefone,
          tipo: profiles.tipo,
          status: profiles.status,
          bloqueadoEm: profiles.bloqueadoEm,
          bloqueioDias: profiles.bloqueioDias,
          bloqueioMotivo: profiles.bloqueioMotivo,
        })
        .from(profiles)
        .where(where)
        .orderBy(asc(profiles.nome))
        .limit(PAGE_SIZE)
        .offset(offset),
      getCurrentProfile(),
    ]);

    // Frequência (intervalo médio entre visitas) e recência (dias sem atividade) dos clientes exibidos.
    const clienteIds = rows.filter((u) => u.tipo === "cliente").map((u) => u.id);
    const [visitas, compras] = clienteIds.length
      ? await Promise.all([
          db
            .select({ clienteId: agendamentos.clienteId, dataHora: agendamentos.dataHora })
            .from(agendamentos)
            .where(and(eq(agendamentos.status, "finalizado"), inArray(agendamentos.clienteId, clienteIds))),
          db
            .select({ clienteId: vendasProdutos.clienteId, dataHora: vendasProdutos.dataHora })
            .from(vendasProdutos)
            .where(inArray(vendasProdutos.clienteId, clienteIds)),
        ])
      : [[], []];
    const visitasValidas = visitas.filter(
      (v): v is { clienteId: string; dataHora: Date } => v.clienteId !== null,
    );
    const freq = frequenciaPorCliente(visitasValidas);
    const atividade = ultimaAtividadePorCliente([
      ...visitasValidas,
      ...compras.filter((c): c is { clienteId: string; dataHora: Date } => c.clienteId !== null),
    ]);

    conteudo = (
      <UsuariosClient
        usuarios={rows.map((u) => ({
          ...u,
          bloqueadoEm: u.bloqueadoEm ? u.bloqueadoEm.toISOString() : null,
          frequenciaDias: freq.get(u.id) ?? null,
          diasSemRetornar: atividade.has(u.id) ? diasDesde(atividade.get(u.id)!) : null,
        }))}
        usuarioAtualId={atual.id}
        page={pagina}
        pageCount={totalPaginas(total[0]?.n ?? 0)}
      />
    );
  } else {
    const cond: SQL[] = [];
    if (q) cond.push(ilike(servicos.nome, `%${q}%`));
    if (status === "ativos") cond.push(eq(servicos.ativo, true));
    if (status === "inativos") cond.push(eq(servicos.ativo, false));
    const where = cond.length ? and(...cond) : undefined;

    const [total, rows, cfgPagamento] = await Promise.all([
      db.select({ n: count() }).from(servicos).where(where),
      db.select().from(servicos).where(where).orderBy(asc(servicos.nome)).limit(PAGE_SIZE).offset(offset),
      getIntegracaoPagamento(),
    ]);
    conteudo = (
      <ServicosClient
        servicos={rows}
        taxaCartao={Number(cfgPagamento?.taxaCartao ?? "3.03")}
        page={pagina}
        pageCount={totalPaginas(total[0]?.n ?? 0)}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Cadastros" description="Serviços, produtos e planos do estabelecimento." />
      <UrlTabBar tabs={TABS} defaultTab="servicos" />
      {conteudo}
    </div>
  );
}
