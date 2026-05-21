/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens TypeScript: Fornecedor
 * ────────────────────────────────────────────────────────────────────────── */

export type NaturezaFornecedor = "PESSOA_FISICA" | "PESSOA_JURIDICA";

export type TipoFornecedorContrato =
  | "REVENDEDOR"
  | "FABRICANTE"
  | "REVENDEDOR_E_FABRICANTE";

export interface ContatoFornecedor {
  nome: string;
  telefone: string | null;
  email: string | null;
  cargo: string | null;
}

export interface CatalogoProdutoResumo {
  id: number;
  nome: string;
  criado_em: string;
  atualizado_em: string;
}

export interface FornecedorResponse {
  id: number;
  nome: string;
  natureza: NaturezaFornecedor;
  documento: string | null;
  site: string | null;
  email: string | null;
  telefone: string | null;
  contatos: ContatoFornecedor[];
  portfolio: CatalogoProdutoResumo[];
  criado_em: string;
  atualizado_em: string;
}

export interface FornecedorResumo {
  id: number;
  nome: string;
  documento: string | null;
  natureza: NaturezaFornecedor;
}
