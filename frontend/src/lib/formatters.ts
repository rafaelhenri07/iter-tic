/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Helpers de formatação
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Traduz o numero_revisao para um nome legível:
 *  - 0 → "Versão Inicial"
 *  - N → "Revisão N"
 */
export function formatarNomeRevisao(numero_revisao: number): string {
  if (numero_revisao === 0) return "Versão Inicial";
  return `Revisão ${numero_revisao}`;
}

/**
 * Formata valores monetários em BRL.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata valores monetários em BRL com coerção segura.
 * Aceita number, string (Decimal do backend) ou null/undefined.
 * Retorna "R$ 0,00" caso o valor seja inválido.
 */
export function formatarMoedaBRL(
  valor: number | string | null | undefined,
): string {
  if (valor === null || valor === undefined || valor === "") return "R$ 0,00";
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata data ISO para dd/mm/yyyy.
 */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}
