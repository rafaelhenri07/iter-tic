/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens do Dashboard (Visão Geral)
 * Espelha DashboardResponse do backend (app/api/routers/dashboard.py)
 * ────────────────────────────────────────────────────────────────────────── */

export interface PdticMetricas {
  periodo_vigente: string | null;
  total_acoes_ativas: number;
  distribuicao_status: Record<string, number>;
}

export interface PaccMetricas {
  exercicio_vigente: number | null;
  total_itens_ativos: number;
  valor_total_estimado: number;
}

export interface ProjetosDistribuicaoComplexidade {
  baixa: number;
  media: number;
  alta: number;
}

export interface GargaloArtefato {
  tipo: string;
  quantidade: number;
}

export interface ProjetosMetricas {
  total_projetos_ativos: number;
  total_artefatos: number;
  artefatos_concluidos: number;
  distribuicao_complexidade: ProjetosDistribuicaoComplexidade;
  gargalos_artefatos: GargaloArtefato[];
}

export interface DashboardResponse {
  pdtic: PdticMetricas;
  pacc: PaccMetricas;
  projetos: ProjetosMetricas;
}
