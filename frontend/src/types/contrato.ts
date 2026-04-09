/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens TypeScript do Módulo 4: Contratos e Fiscalização
 * ────────────────────────────────────────────────────────────────────────── */

/* ── Enums ─────────────────────────────────────────────────────────────── */

export type TipoContrato = "Aquisição" | "Serviço continuado" | "Subscrição";

export type SituacaoContrato =
  | "Vigente"
  | "Extinto"
  | "Extinto, mas suporte vigente";

/* ── Configuração visual (badges) ──────────────────────────────────────── */

export const TIPO_CONTRATO_CONFIG: Record<
  TipoContrato,
  { icon: string; cls: string }
> = {
  Aquisição: {
    icon: "📦",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  "Serviço continuado": {
    icon: "🔄",
    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  },
  Subscrição: {
    icon: "🔑",
    cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  },
};

export const SITUACAO_CONTRATO_CONFIG: Record<
  SituacaoContrato,
  { icon: string; cls: string }
> = {
  Vigente: {
    icon: "✅",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  Extinto: {
    icon: "⛔",
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  "Extinto, mas suporte vigente": {
    icon: "⚠️",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
};

/* ── Objetos aninhados ─────────────────────────────────────────────────── */

export interface ProjetoOrigemResumo {
  id: number;
  nome: string;
  processo_sei: string;
}

export interface AcaoPdticResumo {
  id: number;
  codigo_acao: string;
  descricao: string;
}

export interface ServidorResumo {
  id: number;
  nome: string;
  cargo: string;
  matricula: string;
}

export interface EquipeFiscalizacao {
  gestor: ServidorResumo | null;
  fiscal_requisitante: ServidorResumo | null;
  fiscal_tecnico: ServidorResumo | null;
  fiscal_administrativo: ServidorResumo | null;
}

/* ── Histórico / Auditoria ─────────────────────────────────────────────── */

export type TipoRegistroHistorico = "Edição de Sistema" | "Observação Manual";

export interface HistoricoContrato {
  id: number;
  contrato_id: number;
  data_hora: string;
  autor: string;
  tipo_registro: TipoRegistroHistorico;
  conteudo: string;
}

/* ── Contrato (resposta completa) ──────────────────────────────────────── */

export interface ContratoResponse {
  id: number;
  numero_contrato: string;
  projeto_id: number;
  empresa_contratada: string;
  fabricante: string | null;
  tipo_contrato: TipoContrato;
  quantidade: number;
  tecnologia_utilizada: string | null;

  valor_investimento: number;
  valor_custeio: number;
  valor_total: number;

  prazo: string | null;
  data_assinatura: string;
  data_fim_vigencia: string;

  situacao_atual: SituacaoContrato;
  observacoes: string | null;

  criado_em: string;
  atualizado_em: string;

  gestor_id: number | null;
  fiscal_requisitante_id: number | null;
  fiscal_tecnico_id: number | null;
  fiscal_administrativo_id: number | null;

  projeto_origem: ProjetoOrigemResumo | null;
  acoes_pdtic_vinculadas: AcaoPdticResumo[];
  equipe: EquipeFiscalizacao | null;
  historico: HistoricoContrato[];
}

/* ── Contrato (listagem otimizada) ─────────────────────────────────────── */

export interface ContratoListagem {
  id: number;
  numero_contrato: string;
  empresa_contratada: string;
  tipo_contrato: TipoContrato;
  situacao_atual: SituacaoContrato;
  valor_investimento: number;
  valor_custeio: number;
  valor_total: number;
  data_assinatura: string;
  data_fim_vigencia: string;
  quantidade: number;
  projeto_nome: string | null;
  projeto_processo_sei: string | null;
  nome_gestor: string | null;
}

/* ── Payload de criação ────────────────────────────────────────────────── */

export interface ContratoCreatePayload {
  projeto_id: number;
  numero_contrato: string;
  empresa_contratada: string;
  fabricante?: string | null;
  tipo_contrato: TipoContrato;
  quantidade: number;
  tecnologia_utilizada?: string | null;
  valor_investimento: number;
  valor_custeio: number;
  prazo?: string | null;
  data_assinatura: string;
  data_fim_vigencia: string;
  situacao_atual: SituacaoContrato;
  observacoes?: string | null;
  gestor_id?: number | null;
  fiscal_requisitante_id?: number | null;
  fiscal_tecnico_id?: number | null;
  fiscal_administrativo_id?: number | null;
}
