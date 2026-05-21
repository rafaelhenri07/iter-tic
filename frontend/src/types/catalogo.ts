/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens TypeScript: Catálogo de Produtos/Serviços
 * ────────────────────────────────────────────────────────────────────────── */

export interface CatalogoProduto {
  id: number;
  nome: string;
  tipo: string;
  criado_em: string;
  atualizado_em: string;

  // Dados de inteligência de relacionamento
  fornecedores_vinculados: string[];
  ja_contratado: boolean;
  fornecedores_contratados: string[];
}

export interface CatalogoProdutoPayload {
  nome: string;
  tipo: string;
}
