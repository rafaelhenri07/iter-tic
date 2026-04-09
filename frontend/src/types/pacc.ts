/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens do módulo PACC (espelha os schemas Pydantic)
 * ────────────────────────────────────────────────────────────────────────── */

import type { PdticAcao } from "./pdtic";

/* ── Exercício ─────────────────────────────────────────────────────────── */

export interface PaccExercicio {
  id: number;
  ano: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

/* ── Revisão ───────────────────────────────────────────────────────────── */

export interface PaccRevisao {
  id: number;
  exercicio_id: number;
  numero_revisao: number;
  data_aprovacao: string | null;
  descricao: string | null;
  criado_em: string;
}

/* ── Item PACC ─────────────────────────────────────────────────────────── */

export interface PaccItem {
  id: number;
  numero_item: string;

  /* Ciclo de vida */
  exercicio_id: number;
  revisao_inclusao_id: number;
  revisao_exclusao_id: number | null;
  item_pai_id: number | null;

  /* Vínculo PDTIC */
  acao_pdtic_id: number;

  /* Campos de negócio */
  descricao_demanda: string;
  quantidade: string;
  valor_estimado: number; // Decimal → number no JSON
  processo_sei: string | null;

  /* Timestamps */
  criado_em: string;
  atualizado_em: string;
}

/** Item com ação PDTIC eager-loaded (usado em itens_ativos do painel) */
export interface PaccItemComAcao extends PaccItem {
  acao_pdtic: PdticAcao | null;
}

/* ── Resposta do painel ────────────────────────────────────────────────── */

/** Resposta da rota GET /pacc/{exercicio_id}/painel */
export interface PaccPainelResponse {
  exercicio: PaccExercicio;
  revisoes: PaccRevisao[];
  itens_ativos: PaccItemComAcao[];
  itens_excluidos: PaccItem[];
}
