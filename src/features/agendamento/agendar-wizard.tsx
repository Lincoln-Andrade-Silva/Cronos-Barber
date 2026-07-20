"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Clock, Scissors } from "lucide-react";
import { Button, Card, FormError } from "@/components/ui";
import type { Barbeiro, Servico } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatBRL, formatDuracao } from "@/lib/format";
import { criarAgendamento, getHorariosDisponiveis } from "./actions";

function ymd(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function rotuloData(data: string): { semana: string; dia: string } {
  const d = new Date(`${data}T12:00:00-03:00`);
  const semana = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  });
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

const PASSOS = ["Serviço", "Profissional", "Horário"];

export function AgendarWizard({
  servicos,
  barbeiros,
}: {
  servicos: Servico[];
  barbeiros: Barbeiro[];
}) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [servico, setServico] = useState<Servico | null>(null);
  const [barbeiro, setBarbeiro] = useState<Barbeiro | null>(null);
  const [data, setData] = useState<string>(PROXIMOS_DIAS[0]);
  const [hora, setHora] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, startTransition] = useTransition();

  useEffect(() => {
    if (passo !== 2 || !barbeiro || !servico) return;
    let ativo = true;
    setCarregandoSlots(true);
    setHora(null);
    getHorariosDisponiveis(barbeiro.id, servico.id, data).then((res) => {
      if (ativo) {
        setSlots(res);
        setCarregandoSlots(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, [passo, barbeiro, servico, data]);

  function confirmar() {
    if (!servico || !barbeiro || !hora) return;
    setErro(null);
    startTransition(async () => {
      const res = await criarAgendamento(barbeiro.id, servico.id, data, hora);
      if (res.error) {
        setErro(res.error);
        // recarrega slots (o horário pode ter sido ocupado)
        const novos = await getHorariosDisponiveis(barbeiro.id, servico.id, data);
        setSlots(novos);
        setHora(null);
        return;
      }
      setSucesso(true);
    });
  }

  if (sucesso) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Agendamento confirmado!</h2>
        <p className="mt-1 text-sm text-muted">
          {servico?.nome} com {barbeiro?.nome} em {rotuloData(data).dia} às {hora}.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => router.push("/")}>Voltar ao início</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSucesso(false);
              setPasso(0);
              setServico(null);
              setBarbeiro(null);
              setHora(null);
              setData(PROXIMOS_DIAS[0]);
              setErro(null);
            }}
          >
            Fazer outro agendamento
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Indicador de passos */}
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
            <span
              className={cn(
                "text-sm font-medium",
                i === passo ? "text-ink" : "text-muted2",
              )}
            >
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

      {/* Passo 1: Serviço */}
      {passo === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {servicos.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServico(s);
                setPasso(1);
              }}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4 text-left transition hover:border-brand/40 hover:bg-surface"
            >
              <div>
                <p className="font-semibold">{s.nome}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3 w-3" />
                  {formatDuracao(s.duracaoMinutos)}
                </p>
              </div>
              <span className="font-semibold text-brand-light">{formatBRL(s.preco)}</span>
            </button>
          ))}
          {servicos.length === 0 && (
            <p className="text-sm text-muted">Nenhum serviço disponível no momento.</p>
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

          <Button
            className="w-full"
            disabled={!hora || enviando}
            onClick={confirmar}
          >
            {enviando ? "Confirmando..." : "Confirmar agendamento"}
          </Button>
        </div>
      )}
    </div>
  );
}
