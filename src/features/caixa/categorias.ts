export type TipoMovimentacao = "entrada" | "saida";

export const CATEGORIAS: Record<TipoMovimentacao, { value: string; label: string }[]> = {
  entrada: [
    { value: "aporte", label: "Aporte" },
    { value: "outros", label: "Outros" },
  ],
  saida: [
    { value: "despesa", label: "Despesa" },
    { value: "retirada", label: "Retirada" },
    { value: "outros", label: "Outros" },
  ],
};

export const CATEGORIA_LABEL: Record<string, string> = {
  despesa: "Despesa",
  retirada: "Retirada",
  aporte: "Aporte",
  outros: "Outros",
};

export function categoriasValidas(tipo: string): string[] {
  return (CATEGORIAS[tipo as TipoMovimentacao] ?? []).map((c) => c.value);
}

export function rotuloCategoria(valor: string): string {
  return CATEGORIA_LABEL[valor] ?? valor;
}
