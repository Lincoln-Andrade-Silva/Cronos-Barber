"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw, Star, Trash2, X } from "lucide-react";
import { ConfirmModal, FormError } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import {
  cancelarAgendamentoAdmin,
  estornarAgendamentoAdmin,
  excluirAgendamento,
} from "./actions";
import { FinalizarModal, type ProdutoOpcao, type ServicoOpcao } from "./finalizar-modal";

type StatusAg = "agendado" | "finalizado" | "cancelado" | "estornado";
type TipoAcao = "cancelar" | "estornar" | "excluir";
type FormaPagamento = "presencial" | "online";

export interface AgendaItem {
  id: string;
  grupoId: string | null;
  dataHoraISO: string;
  status: StatusAg;
  tipo: "avulso" | "plano";
  valor: string;
  formaPagamento: FormaPagamento;
  pagamentoStatus: string;
  clienteNome: string;
  barbeiroId: string;
  servicoNome: string;
  duracaoMinutos: number;
}

interface Bloco {
  id: string;
  inicio: number;
  fim: number;
  status: StatusAg;
  formaPagamento: FormaPagamento;
  pagamentoStatus: string;
  clienteNome: string;
  temPlano: boolean;
  valorTotal: number;
  servicos: { nome: string; valor: string; inicio: number; fim: number }[];
}

interface Posicionado {
  bloco: Bloco;
  col: number;
  colunas: number;
}

const PX_HORA = 104;

function minutosDoDia(iso: string): number {
  const t = new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Agrupa serviços da mesma marcação (grupoId) num bloco só. */
function montarBlocos(items: AgendaItem[]): Bloco[] {
  const ordenados = [...items].sort(
    (a, b) => minutosDoDia(a.dataHoraISO) - minutosDoDia(b.dataHoraISO),
  );
  const mapa = new Map<string, Bloco>();
  for (const item of ordenados) {
    const chave = item.grupoId ?? item.id;
    const inicio = minutosDoDia(item.dataHoraISO);
    const fim = inicio + item.duracaoMinutos;
    const bloco = mapa.get(chave);
    if (!bloco) {
      mapa.set(chave, {
        id: item.id,
        inicio,
        fim,
        status: item.status,
        formaPagamento: item.formaPagamento,
        pagamentoStatus: item.pagamentoStatus,
        clienteNome: item.clienteNome,
        temPlano: item.tipo === "plano",
        valorTotal: Number(item.valor),
        servicos: [{ nome: item.servicoNome, valor: item.valor, inicio, fim }],
      });
    } else {
      bloco.inicio = Math.min(bloco.inicio, inicio);
      bloco.fim = Math.max(bloco.fim, fim);
      bloco.temPlano = bloco.temPlano || item.tipo === "plano";
      bloco.valorTotal += Number(item.valor);
      bloco.servicos.push({ nome: item.servicoNome, valor: item.valor, inicio, fim });
    }
  }
  return [...mapa.values()];
}

/** Distribui em colunas lado a lado os blocos com horários sobrepostos. */
function posicionar(blocos: Bloco[]): Posicionado[] {
  const eventos: Posicionado[] = blocos
    .map((bloco) => ({ bloco, col: 0, colunas: 1 }))
    .sort((a, b) => a.bloco.inicio - b.bloco.inicio || a.bloco.fim - b.bloco.fim);

  let grupo: Posicionado[] = [];
  let fimGrupo = -Infinity;

  const fecharGrupo = () => {
    const fimPorColuna: number[] = [];
    for (const ev of grupo) {
      let coluna = fimPorColuna.findIndex((fim) => fim <= ev.bloco.inicio);
      if (coluna === -1) {
        coluna = fimPorColuna.length;
        fimPorColuna.push(ev.bloco.fim);
      } else {
        fimPorColuna[coluna] = ev.bloco.fim;
      }
      ev.col = coluna;
    }
    for (const ev of grupo) ev.colunas = fimPorColuna.length;
  };

  for (const ev of eventos) {
    if (grupo.length && ev.bloco.inicio >= fimGrupo) {
      fecharGrupo();
      grupo = [];
      fimGrupo = -Infinity;
    }
    grupo.push(ev);
    fimGrupo = Math.max(fimGrupo, ev.bloco.fim);
  }
  if (grupo.length) fecharGrupo();

  return eventos;
}

const bordaStatus: Record<StatusAg, string> = {
  agendado: "border-line border-l-brand",
  finalizado: "border-line border-l-emerald-500",
  cancelado: "border-red-400/50 border-l-red-400",
  estornado: "border-amber-400/50 border-l-amber-400",
};

const acaoBtn =
  "inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-panel text-muted transition disabled:opacity-50";

const TEXTOS: Record<TipoAcao, { titulo: string; verbo: string; label: string }> = {
  cancelar: { titulo: "Cancelar agendamento", verbo: "cancelar", label: "Cancelar" },
  estornar: { titulo: "Estornar atendimento", verbo: "estornar", label: "Estornar" },
  excluir: { titulo: "Excluir agendamento", verbo: "excluir", label: "Excluir" },
};

/** Selo do pagamento no card. Null = presencial sem nada a destacar. */
function seloPagamento(bloco: Bloco): { texto: string; cor: string } | null {
  if (bloco.pagamentoStatus === "estornado" || bloco.status === "estornado") {
    return { texto: "Estornado", cor: "text-amber-400" };
  }
  if (bloco.pagamentoStatus === "pago") {
    return { texto: "Pago online", cor: "text-emerald-400" };
  }
  if (bloco.formaPagamento === "online" && bloco.pagamentoStatus === "pendente") {
    return { texto: "Aguardando pgto", cor: "text-amber-400" };
  }
  if (!bloco.temPlano && bloco.valorTotal > 0) {
    return { texto: "A receber", cor: "text-muted2" };
  }
  return null;
}

export function AgendaLista({
  items,
  barbeiroNome,
  barbeiroFotoUrl,
  servicos,
  produtos,
}: {
  items: AgendaItem[];
  barbeiroNome?: string;
  barbeiroFotoUrl?: string | null;
  servicos: ServicoOpcao[];
  produtos: ProdutoOpcao[];
}) {
  const [acao, setAcao] = useState<{ bloco: Bloco; tipo: TipoAcao } | null>(null);
  const [finalizar, setFinalizar] = useState<Bloco | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!acao) return;
    const { bloco, tipo } = acao;
    setErro(null);
    startTransition(async () => {
      let res: { error?: string };
      if (tipo === "cancelar") res = await cancelarAgendamentoAdmin(bloco.id);
      else if (tipo === "estornar") res = await estornarAgendamentoAdmin(bloco.id);
      else res = await excluirAgendamento(bloco.id);
      if (res.error) setErro(res.error);
      setAcao(null);
    });
  }

  const textos = acao ? TEXTOS[acao.tipo] : null;

  const pendentes = items.filter((i) => i.status === "agendado").length;
  const finalizados = items.filter((i) => i.status === "finalizado").length;
  const cancelados = items.filter((i) => i.status === "cancelado").length;
  const estornados = items.filter((i) => i.status === "estornado").length;

  const blocos = montarBlocos(items);
  const posicionados = posicionar(blocos);
  const minInicio = blocos.length ? Math.min(...blocos.map((b) => b.inicio)) : 8 * 60;
  const maxFim = blocos.length ? Math.max(...blocos.map((b) => b.fim)) : 19 * 60;
  const inicioGrade = Math.floor(Math.min(8 * 60, minInicio) / 60) * 60;
  const fimGrade = Math.ceil(Math.max(19 * 60, maxFim) / 60) * 60;
  const alturaTotal = ((fimGrade - inicioGrade) / 60) * PX_HORA;

  const linhas: number[] = [];
  for (let m = inicioGrade; m <= fimGrade; m += 60) linhas.push(m);

  return (
    <div className="space-y-3">
      {erro && <FormError>{erro}</FormError>}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
        {barbeiroNome &&
          (barbeiroFotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barbeiroFotoUrl}
              alt={barbeiroNome}
              className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-fg">
              {barbeiroNome.charAt(0).toUpperCase()}
            </span>
          ))}
        <div className="min-w-0">
          {barbeiroNome && <p className="truncate font-semibold">{barbeiroNome}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            <span className="text-muted">{blocos.length} atend.</span>
            <span className="text-brand-light">{pendentes} pendentes</span>
            <span className="text-emerald-400">{finalizados} finalizados</span>
            <span className="text-muted2">{cancelados} cancelados</span>
            {estornados > 0 && <span className="text-amber-400">{estornados} estornados</span>}
          </div>
        </div>
      </div>

      <div className="no-scrollbar max-h-[68vh] overflow-y-auto rounded-2xl border border-line bg-panel">
        <div className="relative" style={{ height: alturaTotal }}>
          {linhas.map((m) => (
            <div
              key={m}
              className="pointer-events-none absolute inset-x-0 flex items-start"
              style={{ top: ((m - inicioGrade) / 60) * PX_HORA }}
            >
              <span className="w-14 shrink-0 -translate-y-2 pl-2 text-[11px] text-muted2">
                {hhmm(m)}
              </span>
              <div className="mt-px flex-1 border-t border-line/70" />
            </div>
          ))}

          {items.length === 0 && (
            <p className="absolute inset-x-0 top-8 text-center text-sm text-muted">
              Nenhum agendamento neste dia.
            </p>
          )}

          <div className="absolute inset-y-0 left-14 right-2">
            {posicionados.map(({ bloco, col, colunas }) => {
              const top = ((bloco.inicio - inicioGrade) / 60) * PX_HORA;
              const altura = Math.max(((bloco.fim - bloco.inicio) / 60) * PX_HORA, 48);
              const multi = bloco.servicos.length > 1;
              const selo = seloPagamento(bloco);
              const aguardandoPgto =
                bloco.formaPagamento === "online" && bloco.pagamentoStatus === "pendente";
              const podeEstornar =
                (bloco.pagamentoStatus === "pago" || bloco.status === "finalizado") &&
                bloco.status !== "estornado" &&
                bloco.status !== "cancelado";
              return (
                <div
                  key={bloco.id}
                  className={cn(
                    "absolute overflow-hidden rounded-lg border border-l-4 px-2 py-1.5",
                    bordaStatus[bloco.status],
                    aguardandoPgto ? "bg-amber-500/15" : "bg-surface",
                  )}
                  style={{
                    top: top + 2,
                    height: altura - 4,
                    left: `calc(${(col / colunas) * 100}% + ${col === 0 ? 0 : 2}px)`,
                    width: `calc(${100 / colunas}% - ${colunas === 1 ? 0 : 4}px)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex items-center gap-1 text-xs font-semibold">
                        <span className="truncate">{bloco.clienteNome}</span>
                        {bloco.temPlano && (
                          <Star className="h-3 w-3 shrink-0 fill-brand-light text-brand-light" />
                        )}
                      </p>
                      {bloco.servicos.map((s, i) => (
                        <p key={i} className="truncate text-[11px] text-muted">
                          {multi && <span className="text-muted2">{hhmm(s.inicio)} </span>}
                          {s.nome} - {formatBRL(s.valor)}
                        </p>
                      ))}
                      <p className="truncate text-[10px] text-muted2">
                        {hhmm(bloco.inicio)} - {hhmm(bloco.fim)} · {bloco.fim - bloco.inicio}min
                        {multi && <> · Total {formatBRL(bloco.valorTotal)}</>}
                      </p>
                      {selo && (
                        <p className={cn("truncate text-[10px] font-semibold", selo.cor)}>
                          {selo.texto}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {bloco.status === "agendado" && !aguardandoPgto && (
                        <button
                          type="button"
                          title="Finalizar"
                          disabled={pending}
                          onClick={() => setFinalizar(bloco)}
                          className={cn(acaoBtn, "hover:border-emerald-500/40 hover:text-emerald-400")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {bloco.status === "agendado" && bloco.pagamentoStatus !== "pago" && (
                        <button
                          type="button"
                          title="Cancelar"
                          disabled={pending}
                          onClick={() => setAcao({ bloco, tipo: "cancelar" })}
                          className={cn(acaoBtn, "hover:border-amber-500/40 hover:text-amber-400")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {podeEstornar && (
                        <button
                          type="button"
                          title="Estornar"
                          disabled={pending}
                          onClick={() => setAcao({ bloco, tipo: "estornar" })}
                          className={cn(acaoBtn, "hover:border-amber-500/40 hover:text-amber-400")}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Excluir"
                        disabled={pending}
                        onClick={() => setAcao({ bloco, tipo: "excluir" })}
                        className={cn(acaoBtn, "hover:border-red-400 hover:text-red-400")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {finalizar && (
        <FinalizarModal
          key={finalizar.id}
          bloco={{
            id: finalizar.id,
            clienteNome: finalizar.clienteNome,
            valorTotal: finalizar.valorTotal,
            servicos: finalizar.servicos.map((s) => ({ nome: s.nome, valor: s.valor })),
          }}
          servicos={servicos}
          produtos={produtos}
          onClose={() => setFinalizar(null)}
          onFinalizado={() => setFinalizar(null)}
        />
      )}

      <ConfirmModal
        open={!!acao}
        onClose={() => setAcao(null)}
        onConfirm={confirmar}
        loading={pending}
        title={textos?.titulo ?? ""}
        confirmLabel={textos?.label ?? "Confirmar"}
        message={
          acao ? (
            <>
              Deseja {textos?.verbo} o atendimento de{" "}
              <strong className="text-ink">{acao.bloco.clienteNome}</strong> (
              {acao.bloco.servicos.map((s) => s.nome).join(", ")},{" "}
              {formatBRL(acao.bloco.valorTotal)})?
            </>
          ) : null
        }
      />
    </div>
  );
}
