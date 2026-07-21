"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronLeft, Clock, Scissors, Star, Zap } from "lucide-react";
import { Button, Card, FormError } from "@/components/ui";
import type { Barbeiro, Servico } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL, formatDuracao } from "@/lib/format";
import { criarAgendamento, getHorariosDisponiveis, getPrecoAgendamento, type ItemPreco } from "./actions";

function ymd(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function rotuloData(data: string): { semana: string; dia: string } {
  const d = new Date(`${data}T12:00:00-03:00`);
  const semana = d.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" });
  const dia = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return { semana: semana.replace(".", ""), dia };
}

const PROXIMOS_DIAS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return ymd(d);
});

const PASSOS = ["Serviços", "Profissional", "Horário"];

export function AgendarWizard({
  servicos,
  barbeiros,
  servicosCobertos,
}: {
  servicos: Servico[];
  barbeiros: Barbeiro[];
  servicosCobertos: string[];
}) {
  const router = useRouter();
  const cobertos = new Set(servicosCobertos);
  const [passo, setPasso] = useState(0);
  const [selecionados, setSelecionados] = useState<Servico[]>([]);
  const [barbeiro, setBarbeiro] = useState<Barbeiro | null>(null);
  const [data, setData] = useState<string>(PROXIMOS_DIAS[0]);
  const [hora, setHora] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [precos, setPrecos] = useState<ItemPreco[] | null>(null);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, startTransition] = useTransition();
  const pularReset = useRef(false);

  const idsKey = selecionados.map((s) => s.id).join(",");
  const duracaoTotal = selecionados.reduce((s, x) => s + x.duracaoMinutos, 0);
  const totalEstimado = selecionados.reduce(
    (s, x) => s + (cobertos.has(x.id) ? 0 : Number(x.preco)),
    0,
  );

  const totalNaData = useMemo(
    () => (precos ? precos.reduce((s, p) => s + Number(p.valor), 0) : null),
    [precos],
  );
  const naoCobertosNoDia = useMemo(() => {
    if (!precos) return [];
    return selecionados.filter(
      (s) => cobertos.has(s.id) && !precos.find((p) => p.servicoId === s.id)?.coberto,
    );
  }, [precos, selecionados, cobertos]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [passo]);

  useEffect(() => {
    if (passo !== 2 || !barbeiro || selecionados.length === 0) return;
    let ativo = true;
    setCarregandoSlots(true);
    getHorariosDisponiveis(barbeiro.id, idsKey.split(","), data).then((res) => {
      if (!ativo) return;
      setSlots(res);
      setCarregandoSlots(false);
      if (pularReset.current) {
        pularReset.current = false;
        setHora(res[0] ?? null);
      } else {
        setHora(null);
      }
    });
    return () => {
      ativo = false;
    };
  }, [passo, barbeiro, idsKey, data, selecionados.length]);

  useEffect(() => {
    if (passo !== 2 || selecionados.length === 0) return;
    let ativo = true;
    setPrecos(null);
    getPrecoAgendamento(idsKey.split(","), data).then((res) => {
      if (ativo) setPrecos(res);
    });
    return () => {
      ativo = false;
    };
  }, [passo, idsKey, data, selecionados.length]);

  async function primeiroDisponivel() {
    if (!barbeiro || selecionados.length === 0) return;
    const ids = selecionados.map((s) => s.id);
    setBuscando(true);
    for (const dia of PROXIMOS_DIAS) {
      const res = await getHorariosDisponiveis(barbeiro.id, ids, dia);
      if (res.length > 0) {
        if (dia === data) {
          setSlots(res);
          setHora(res[0]);
        } else {
          pularReset.current = true;
          setData(dia);
        }
        setBuscando(false);
        return;
      }
    }
    setBuscando(false);
  }

  function toggleServico(s: Servico) {
    setSelecionados((prev) =>
      prev.some((x) => x.id === s.id) ? prev.filter((x) => x.id !== s.id) : [...prev, s],
    );
  }

  function confirmar() {
    if (selecionados.length === 0 || !barbeiro || !hora) return;
    setErro(null);
    startTransition(async () => {
      const ids = selecionados.map((s) => s.id);
      const res = await criarAgendamento(barbeiro.id, ids, data, hora);
      if (res.error) {
        setErro(res.error);
        const novos = await getHorariosDisponiveis(barbeiro.id, ids, data);
        setSlots(novos);
        setHora(null);
        return;
      }
      setSucesso(true);
    });
  }

  function reiniciar() {
    setSucesso(false);
    setPasso(0);
    setSelecionados([]);
    setBarbeiro(null);
    setHora(null);
    setData(PROXIMOS_DIAS[0]);
    setErro(null);
  }

  if (sucesso) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Agendamento confirmado!</h2>
        <p className="mt-1 text-sm text-muted">
          {selecionados.map((s) => s.nome).join(", ")} com {barbeiro?.nome} em {rotuloData(data).dia}{" "}
          às {hora}.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => router.push("/meus-agendamentos")}>Meus agendamentos</Button>
          <Button variant="secondary" onClick={reiniciar}>
            Fazer outro agendamento
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        {PASSOS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                i <= passo ? "bg-brand text-white" : "bg-surface text-muted2",
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-sm font-medium", i === passo ? "text-ink" : "text-muted2")}>
              {label}
            </span>
            {i < PASSOS.length - 1 && <div className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>

      {passo > 0 && (
        <button
          type="button"
          onClick={() => {
            setErro(null);
            setPasso((p) => p - 1);
          }}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      )}

      {/* Passo 1: Serviços (múltipla escolha) */}
      {passo === 0 && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {servicos.map((s) => {
              const sel = selecionados.some((x) => x.id === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleServico(s)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition",
                    sel ? "border-brand bg-brand/5" : "border-line bg-panel hover:border-brand/40 hover:bg-surface",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                        sel ? "border-brand bg-brand text-white" : "border-line2",
                      )}
                    >
                      {sel && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-semibold">
                        <span className="truncate">{s.nome}</span>
                        {cobertos.has(s.id) && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-brand-light text-brand-light" />
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <Clock className="h-3 w-3" />
                        {formatDuracao(s.duracaoMinutos)}
                      </p>
                    </div>
                  </div>
                  {cobertos.has(s.id) ? (
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-muted2 line-through">{formatBRL(s.preco)}</span>
                      <span className="font-semibold text-emerald-400">Grátis</span>
                    </span>
                  ) : (
                    <span className="shrink-0 font-semibold text-brand-light">{formatBRL(s.preco)}</span>
                  )}
                </button>
              );
            })}
            {servicos.length === 0 && (
              <p className="text-sm text-muted">Nenhum serviço disponível no momento.</p>
            )}
          </div>

          {selecionados.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {selecionados.length} {selecionados.length === 1 ? "serviço" : "serviços"}
                </p>
                <p className="text-xs text-muted">
                  {formatDuracao(duracaoTotal)} ·{" "}
                  {totalEstimado === 0 ? "Grátis" : formatBRL(totalEstimado)}
                </p>
              </div>
              <Button onClick={() => setPasso(1)}>Continuar</Button>
            </div>
          )}
        </div>
      )}

      {/* Passo 2: Profissional */}
      {passo === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {barbeiros.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBarbeiro(b);
                setPasso(2);
              }}
              className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4 text-left transition hover:border-brand/40 hover:bg-surface"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-sm font-semibold text-muted2">
                {b.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.fotoUrl} alt={b.nome} className="h-full w-full object-cover" />
                ) : (
                  <Scissors className="h-5 w-5" />
                )}
              </div>
              <p className="font-semibold">{b.nome}</p>
            </button>
          ))}
          {barbeiros.length === 0 && (
            <p className="text-sm text-muted">Nenhum profissional disponível no momento.</p>
          )}
        </div>
      )}

      {/* Passo 3: Data e horário */}
      {passo === 2 && (
        <div className="space-y-6">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {PROXIMOS_DIAS.map((d) => {
              const { semana, dia } = rotuloData(d);
              const ativo = d === data;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setData(d)}
                  className={cn(
                    "flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 transition",
                    ativo
                      ? "border-brand bg-brand/10 text-brand-light"
                      : "border-line text-muted hover:text-ink",
                  )}
                >
                  <span className="text-[11px] font-medium capitalize">{semana}</span>
                  <span className="text-sm font-semibold">{dia}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-line bg-surface/30 px-4 py-2.5 text-xs text-muted">
            {selecionados.map((s) => s.nome).join(" + ")} · {formatDuracao(duracaoTotal)}
          </div>

          <button
            type="button"
            onClick={primeiroDisponivel}
            disabled={buscando}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand/5 py-2.5 text-sm font-semibold text-brand-light transition hover:bg-brand/10 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {buscando ? "Procurando..." : "Primeiro horário disponível"}
          </button>

          {carregandoSlots ? (
            <p className="py-6 text-center text-sm text-muted">Carregando horários...</p>
          ) : slots.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhum horário disponível nesse dia.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setHora(s)}
                  className={cn(
                    "rounded-lg border py-2.5 text-sm font-medium transition",
                    hora === s
                      ? "border-brand bg-brand text-white"
                      : "border-line text-ink hover:border-brand/40 hover:bg-surface",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {erro && <FormError>{erro}</FormError>}

          {naoCobertosNoDia.length > 0 && (
            <p className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Seu plano não cobre {naoCobertosNoDia.map((s) => s.nome).join(", ")} neste dia.
            </p>
          )}

          <Button className="w-full" disabled={!hora || enviando} onClick={confirmar}>
            {enviando
              ? "Confirmando..."
              : totalNaData !== null
                ? `Confirmar agendamento - ${totalNaData === 0 ? "Grátis" : formatBRL(totalNaData)}`
                : "Confirmar agendamento"}
          </Button>
        </div>
      )}
    </div>
  );
}
