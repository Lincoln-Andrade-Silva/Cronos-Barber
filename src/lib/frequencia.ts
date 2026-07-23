const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Intervalo médio (em dias) entre visitas consecutivas. Precisa de ao menos 2 visitas;
 * com menos, retorna null (frequência indeterminada).
 */
export function mediaIntervaloDias(datas: Date[]): number | null {
  if (datas.length < 2) return null;
  const ordenadas = [...datas].sort((a, b) => a.getTime() - b.getTime());
  let soma = 0;
  for (let i = 1; i < ordenadas.length; i++) {
    soma += ordenadas[i].getTime() - ordenadas[i - 1].getTime();
  }
  return soma / (ordenadas.length - 1) / MS_DIA;
}

/** Média de intervalo entre visitas por cliente, a partir de linhas (clienteId, dataHora). */
export function frequenciaPorCliente(
  rows: { clienteId: string; dataHora: Date }[],
): Map<string, number> {
  const porCliente = new Map<string, Date[]>();
  for (const r of rows) {
    const arr = porCliente.get(r.clienteId);
    if (arr) arr.push(r.dataHora);
    else porCliente.set(r.clienteId, [r.dataHora]);
  }
  const medias = new Map<string, number>();
  for (const [id, datas] of porCliente) {
    const media = mediaIntervaloDias(datas);
    if (media != null) medias.set(id, media);
  }
  return medias;
}

/** Média geral entre os clientes que já têm frequência definida (≥2 visitas). */
export function mediaFrequenciaGeral(medias: Map<string, number>): number | null {
  if (medias.size === 0) return null;
  let soma = 0;
  for (const v of medias.values()) soma += v;
  return soma / medias.size;
}

/** Rótulo curto: "a cada N dias" ou "—" quando indeterminado. */
export function formatFrequencia(dias: number | null | undefined): string {
  if (dias == null) return "—";
  const n = Math.round(dias);
  return `a cada ${n} ${n === 1 ? "dia" : "dias"}`;
}

/** Dias decorridos desde `data` até agora (piso, nunca negativo). */
export function diasDesde(data: Date, agora: Date = new Date()): number {
  return Math.max(0, Math.floor((agora.getTime() - data.getTime()) / MS_DIA));
}

/** Data da última atividade por cliente (máximo dataHora entre as linhas informadas). */
export function ultimaAtividadePorCliente(
  rows: { clienteId: string; dataHora: Date }[],
): Map<string, Date> {
  const ultima = new Map<string, Date>();
  for (const r of rows) {
    const atual = ultima.get(r.clienteId);
    if (!atual || r.dataHora.getTime() > atual.getTime()) ultima.set(r.clienteId, r.dataHora);
  }
  return ultima;
}

/** Rótulo de recência: "hoje", "N dias" ou "—" quando nunca houve atividade. */
export function formatRecencia(dias: number | null | undefined): string {
  if (dias == null) return "—";
  if (dias === 0) return "hoje";
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}
