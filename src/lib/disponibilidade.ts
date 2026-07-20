// Fuso fixo do Brasil (sem horário de verão desde 2019). Fixa o instante do slot
// independente do fuso do servidor.
export const TZ_OFFSET = "-03:00";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function minutosParaHora(minutos: number): string {
  return `${pad2(Math.floor(minutos / 60))}:${pad2(minutos % 60)}`;
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Instante (Date) de um slot a partir da data (YYYY-MM-DD) e hora (HH:MM), no fuso do Brasil. */
export function instanteSlot(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00${TZ_OFFSET}`);
}

export interface IntervaloOcupado {
  inicio: Date;
  fim: Date;
}

/**
 * Gera os horários (HH:MM) disponíveis num dia, dado a janela de atendimento,
 * a duração do serviço, o passo e os intervalos já ocupados do barbeiro.
 */
export function gerarHorariosDisponiveis(params: {
  data: string;
  abre: string;
  fecha: string;
  duracaoMinutos: number;
  passoMinutos: number;
  ocupados: IntervaloOcupado[];
  agora?: Date;
}): string[] {
  const { data, abre, fecha, duracaoMinutos, passoMinutos, ocupados, agora } = params;
  const inicioJanela = horaParaMinutos(abre);
  const fimJanela = horaParaMinutos(fecha);
  const disponiveis: string[] = [];

  for (let m = inicioJanela; m + duracaoMinutos <= fimJanela; m += passoMinutos) {
    const hora = minutosParaHora(m);
    const inicio = instanteSlot(data, hora);
    const fim = new Date(inicio.getTime() + duracaoMinutos * 60_000);

    if (agora && inicio.getTime() <= agora.getTime()) continue;

    const colide = ocupados.some((o) => inicio < o.fim && o.inicio < fim);
    if (!colide) disponiveis.push(hora);
  }

  return disponiveis;
}
