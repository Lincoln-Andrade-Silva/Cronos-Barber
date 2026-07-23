export const METODOS_PAGAMENTO = ["dinheiro", "pix", "debito", "credito"] as const;

export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number];

export const METODO_LABEL: Record<MetodoPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
};

export const METODO_OPCOES = METODOS_PAGAMENTO.map((value) => ({
  value,
  label: METODO_LABEL[value],
}));

export function isMetodoPagamento(valor: unknown): valor is MetodoPagamento {
  return typeof valor === "string" && (METODOS_PAGAMENTO as readonly string[]).includes(valor);
}

/** Rótulo para exibição, tolerando null/valores antigos. */
export function rotuloMetodo(valor: string | null | undefined): string {
  return isMetodoPagamento(valor) ? METODO_LABEL[valor] : "Não informado";
}
