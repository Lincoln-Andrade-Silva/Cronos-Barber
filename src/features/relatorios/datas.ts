export function spYmd(data: Date): string {
  return data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function hojeSP(): string {
  return spYmd(new Date());
}

export function diasAtras(dataBase: string, n: number): string {
  const d = new Date(`${dataBase}T12:00:00-03:00`);
  d.setDate(d.getDate() - n);
  return spYmd(d);
}

export function diaCurto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}

/** Lista de datas (YYYY-MM-DD, fuso SP) de `inicio` até `fimExclusivo`. */
export function gerarDias(inicio: Date, fimExclusivo: Date): string[] {
  const dias: string[] = [];
  for (let t = inicio.getTime(); t < fimExclusivo.getTime(); t += 24 * 60 * 60 * 1000) {
    dias.push(spYmd(new Date(t)));
  }
  return dias;
}
