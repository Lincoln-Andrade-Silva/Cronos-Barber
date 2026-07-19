import type { HorarioDia } from "@/db/schema";

export const DIAS_SEMANA = [
  { dia: 1, label: "Segunda-feira" },
  { dia: 2, label: "Terça-feira" },
  { dia: 3, label: "Quarta-feira" },
  { dia: 4, label: "Quinta-feira" },
  { dia: 5, label: "Sexta-feira" },
  { dia: 6, label: "Sábado" },
  { dia: 0, label: "Domingo" },
] as const;

export function horarioPadrao(): HorarioDia[] {
  return DIAS_SEMANA.map(({ dia }) => ({
    dia,
    aberto: dia >= 1 && dia <= 5,
    abre: "09:00",
    fecha: "19:00",
  }));
}

/** Garante uma entrada por dia, na ordem de DIAS_SEMANA, preenchendo faltantes com o padrão. */
export function normalizarHorario(horario: HorarioDia[] | null | undefined): HorarioDia[] {
  const padrao = horarioPadrao();
  if (!horario?.length) return padrao;
  return padrao.map((base) => horario.find((h) => h.dia === base.dia) ?? base);
}
