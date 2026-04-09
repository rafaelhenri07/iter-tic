/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens do módulo PDTIC (espelha os schemas Pydantic)
 * ────────────────────────────────────────────────────────────────────────── */

/* ── Enums ──────────────────────────────────────────────────────────────── */

export type TipoNecessidade =
  | "hardware"
  | "software"
  | "servico"
  | "comunicacao"
  | "capacitacao"
  | "outros";

export type StatusAcao =
  | "Não iniciada"
  | "Em andamento"
  | "Contratada"
  | "Contrato vigente"
  | "Contrato a ser renovado";

/* ── Labels de exibição ─────────────────────────────────────────────────── */

export const TIPO_NECESSIDADE_LABEL: Record<TipoNecessidade, string> = {
  hardware: "Hardware",
  software: "Software",
  servico: "Serviço",
  comunicacao: "Comunicação",
  capacitacao: "Capacitação",
  outros: "Outros",
};

export const STATUS_ACAO_COLOR: Record<StatusAcao, string> = {
  "Não iniciada":
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Em andamento":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  Contratada:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  "Contrato vigente":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  "Contrato a ser renovado":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
};

/* ── DTOs de resposta ───────────────────────────────────────────────────── */

export interface PdticPeriodo {
  id: number;
  ano_inicio: number;
  ano_fim: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface PdticRevisao {
  id: number;
  periodo_id: number;
  numero_revisao: number;
  data_aprovacao: string | null;
  descricao: string | null;
  criado_em: string;
}

export interface PdticAcao {
  id: number;
  codigo_acao: string;
  periodo_id: number;
  revisao_inclusao_id: number;
  revisao_exclusao_id: number | null;
  acao_pai_id: number | null;

  departamento: string;
  unidade_demandante: string;
  unidade_responsavel: string;
  necessidade: string;
  descricao: string;

  tipo_necessidade: TipoNecessidade;
  status: StatusAcao;

  meta: string | null;
  indicador: string | null;
  quantidade: string | null;

  total_gut: number;

  previsao_contratacao: string | null;
  previsao_renovacao: string | null;

  valores_investimento: Record<string, number> | null;
  valores_custeio: Record<string, number> | null;

  criado_em: string;
  atualizado_em: string;
}

/** Resposta da rota GET /pdtic/{periodo_id}/painel */
export interface PdticPainelResponse {
  periodo: PdticPeriodo;
  revisoes: PdticRevisao[];
  acoes_ativas: PdticAcao[];
  acoes_excluidas: PdticAcao[];
}
