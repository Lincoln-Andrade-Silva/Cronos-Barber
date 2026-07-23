import { and, desc, eq, gte, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Ban, ShieldCheck, Users } from "lucide-react";
import { db } from "@/db";
import { bloqueios, profiles } from "@/db/schema";
import { Badge } from "@/components/ui";
import { estadoBloqueio } from "@/lib/bloqueio";
import { diaCurto, spYmd } from "./datas";
import { KpiGrid, Secao } from "./ui";

const MS_DIA = 24 * 60 * 60 * 1000;

type StatusBloqueio = "Ativo" | "Expirado" | "Desbloqueado";
const TOM: Record<StatusBloqueio, "danger" | "muted" | "success"> = {
  Ativo: "danger",
  Expirado: "muted",
  Desbloqueado: "success",
};

export async function PainelBloqueios({
  inicio,
  fimExclusivo,
}: {
  inicio: Date;
  fimExclusivo: Date;
}) {
  const cliente = alias(profiles, "cliente");
  const autor = alias(profiles, "autor");

  const rows = await db
    .select({
      id: bloqueios.id,
      usuarioId: bloqueios.usuarioId,
      clienteNome: cliente.nome,
      motivo: bloqueios.motivo,
      dias: bloqueios.dias,
      bloqueadoEm: bloqueios.bloqueadoEm,
      desbloqueadoEm: bloqueios.desbloqueadoEm,
      autorNome: autor.nome,
    })
    .from(bloqueios)
    .leftJoin(cliente, eq(bloqueios.usuarioId, cliente.id))
    .leftJoin(autor, eq(bloqueios.criadoPorId, autor.id))
    .where(and(gte(bloqueios.bloqueadoEm, inicio), lt(bloqueios.bloqueadoEm, fimExclusivo)))
    .orderBy(desc(bloqueios.bloqueadoEm));

  const itens = rows.map((r) => {
    const vigente = estadoBloqueio({
      bloqueadoEm: r.bloqueadoEm,
      bloqueioDias: r.dias,
      bloqueioMotivo: r.motivo,
    });
    let status: StatusBloqueio;
    let fim: Date | null;
    if (r.desbloqueadoEm) {
      status = "Desbloqueado";
      fim = r.desbloqueadoEm;
    } else if (vigente.ativo) {
      status = "Ativo";
      fim = vigente.ate;
    } else {
      status = "Expirado";
      fim = r.dias != null ? new Date(r.bloqueadoEm.getTime() + r.dias * MS_DIA) : null;
    }
    return {
      id: r.id,
      usuarioId: r.usuarioId,
      clienteNome: r.clienteNome ?? "Cliente removido",
      motivo: r.motivo,
      autorNome: r.autorNome,
      bloqueadoEm: r.bloqueadoEm,
      fim,
      status,
    };
  });

  const ativos = itens.filter((i) => i.status === "Ativo").length;
  const clientesDistintos = new Set(itens.map((i) => i.usuarioId)).size;

  return (
    <div className="space-y-6">
      <KpiGrid
        cards={[
          { label: "Bloqueios no período", valor: String(itens.length), icon: Ban },
          { label: "Ativos agora", valor: String(ativos), icon: ShieldCheck },
          { label: "Clientes bloqueados", valor: String(clientesDistintos), icon: Users },
        ]}
      />

      <Secao titulo="Histórico de bloqueios">
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Nenhum bloqueio no período.</p>
        ) : (
          <ul className="space-y-3">
            {itens.map((i) => (
              <li key={i.id} className="rounded-lg border border-line bg-surface/30 p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{i.clienteNome}</span>
                  <Badge tone={TOM[i.status]}>{i.status}</Badge>
                </div>
                <p className="text-sm text-muted">{i.motivo}</p>
                <p className="mt-1 text-xs text-muted2">
                  {diaCurto(spYmd(i.bloqueadoEm))} a {i.fim ? diaCurto(spYmd(i.fim)) : "sem prazo"}
                  {i.autorNome ? ` · por ${i.autorNome}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
