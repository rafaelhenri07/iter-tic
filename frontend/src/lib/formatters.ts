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

/**
 * Formata telefone para (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  if (!value) return "";
  
  // Remove tudo que não for número
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length === 0) return "";
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  
  // Formato para 11 dígitos (celular)
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Formata documento para CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 */
export function formatCpfCnpj(value: string, isCnpj: boolean): string {
  if (!value) return "";
  
  const numbers = value.replace(/\D/g, "");
  
  if (isCnpj) {
    // CNPJ: 00.000.000/0000-00
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  } else {
    // CPF: 000.000.000-00
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
}

/**
 * Formata string ISO YYYY-MM para o padrão brasileiro MM/YYYY.
 * @param iso String no formato YYYY-MM (ex: "2026-05")
 * @returns String no formato MM/YYYY (ex: "05/2026")
 */
export function formatMonthYear(iso: string | null): string {
  if (!iso) return "—";
  const [year, month] = iso.split("-");
  if (!year || !month) return "—";
  return `${month}/${year}`;
}
