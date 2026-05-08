/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens do Módulo 2: Projetos e Licitações
 * Espelha os schemas Pydantic do backend (app/schemas/projeto.py)
 * ────────────────────────────────────────────────────────────────────────── */

/* ── Enums ──────────────────────────────────────────────────────────────── */

export type PrioridadeProjeto = "baixa" | "media" | "alta";
export type ComplexidadeProjeto = "Simples" | "Intermediária" | "Complexa";

export type StatusProjeto =
  | "Fase interna"
  | "Fase externa"
  | "Contratado";

export type TipoArtefato =
  | "DFD"
  | "ETP"
  | "Mapa de Riscos"
  | "Estimativa de Custos e Orçamento"
  | "TR";

export type StatusArtefato = "Não iniciado" | "Iniciado" | "Concluído";

export type TipoDataAlterada = "data_inicio" | "data_conclusao";

/* ── Labels / Colors ───────────────────────────────────────────────────── */

export const PRIORIDADE_CONFIG: Record<
  PrioridadeProjeto,
  { label: string; cls: string }
> = {
  baixa: {
    label: "Baixa",
    cls: "text-emerald-600 dark:text-emerald-400 font-bold",
  },
  media: {
    label: "Média",
    cls: "text-amber-600 dark:text-amber-500 font-bold",
  },
  alta: {
    label: "Alta",
    cls: "text-rose-600 dark:text-rose-500 font-bold",
  },
};

export const COMPLEXIDADE_CONFIG: Record<
  ComplexidadeProjeto,
  { label: string; cls: string }
> = {
  Simples: {
    label: "Simples",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  "Intermediária": {
    label: "Intermediária",
    cls: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  Complexa: {
    label: "Complexa",
    cls: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
  },
};

export const STATUS_PROJETO_CONFIG: Record<
  StatusProjeto,
  { icon: string; cls: string }
> = {
  "Fase interna": {
    icon: "🔧",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  "Fase externa": {
    icon: "📤",
    cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  },
  "Contratado": {
    icon: "✅",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
};

export const STATUS_ARTEFATO_CONFIG: Record<
  StatusArtefato,
  { cls: string; progressCls: string }
> = {
  "Não iniciado": {
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    progressCls: "bg-gray-300 dark:bg-gray-600",
  },
  Iniciado: {
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    progressCls: "bg-amber-400 dark:bg-amber-500",
  },
  Concluído: {
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    progressCls: "bg-emerald-500 dark:bg-emerald-400",
  },
};

/* ── Unidade Organizacional (Resumo) ─────────────────────────────────────── */

export interface UnidadeOrgResumo {
  id: number;
  nome: string;
  sigla: string | null;
}

/* ── Servidor ──────────────────────────────────────────────────────────── */

export interface Servidor {
  id: number;
  matricula: string;
  nome: string;
  cargo: string;
  funcao: string | null;
  departamento_id: number;
  unidade_lotacao_id: number | null;
  secao_id: number | null;
  departamento?: UnidadeOrgResumo | null;
  unidade_lotacao?: UnidadeOrgResumo | null;
  secao?: UnidadeOrgResumo | null;
  email_funcional: string | null;
  criado_em: string;
  atualizado_em: string;
}

/* ── Artefato ──────────────────────────────────────────────────────────── */

export interface Artefato {
  id: number;
  projeto_id: number;
  tipo: TipoArtefato;
  status: StatusArtefato;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  data_conclusao: string | null;
  justificativa_atraso: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface HistoricoDataArtefato {
  id: number;
  artefato_id: number;
  tipo_data_alterada: TipoDataAlterada;
  data_antiga: string;
  data_nova: string;
  justificativa: string;
  data_registro: string;
}

export interface ArtefatoComHistorico extends Artefato {
  historico_datas: HistoricoDataArtefato[];
}

/* ── Resumos para aninhamento ──────────────────────────────────────────── */

export interface AcaoPdticResumo {
  id: number;
  codigo_acao: string;
  descricao: string;
  status: string;
  tipo_necessidade: string;
}

export interface ItemPaccResumo {
  id: number;
  numero_item: string;
  descricao_demanda: string;
  valor_estimado: number;
  processo_sei: string | null;
}

/* ── Tramitação (Log Fase Externa) ─────────────────────────────────────── */

export interface ProjetoTramitacao {
  id: number;
  projeto_id: number;
  observacao: string;
  autor: string;
  data_hora: string;
}

/* ── Projeto ───────────────────────────────────────────────────────────── */

export interface ProjetoBase {
  id: number;
  nome: string;
  processo_sei: string;
  prioridade: PrioridadeProjeto;
  complexidade: ComplexidadeProjeto;
  status: StatusProjeto;
  criado_em: string;
  atualizado_em: string;
  integrante_requisitante_id: number | null;
  integrante_tecnico_id: number | null;
  integrante_administrativo_id: number | null;
  data_envio_licitacao: string | null;
  situacao_licitacao_texto: string | null;
}

export interface ProjetoComDetalhes extends ProjetoBase {
  integrante_requisitante: Servidor | null;
  integrante_tecnico: Servidor | null;
  integrante_administrativo: Servidor | null;
  acoes_pdtic: AcaoPdticResumo[];
  itens_pacc: ItemPaccResumo[];
  artefatos: Artefato[];
  tramitacoes: ProjetoTramitacao[];
}

export interface ProjetoPainelResponse {
  projeto: ProjetoComDetalhes;
  total_artefatos: number;
  artefatos_concluidos: number;
  artefatos_pendentes: number;
  progresso_percentual: number;
}

/* ── Listagem (ProjetoListagemResponse — otimizado para grid) ──────────── */

export interface ComentarioResumo {
  id: number;
  conteudo: string;
  autor: string;
  criado_em: string;
}

export interface ArtefatoResumo {
  id: number | null;
  tipo: TipoArtefato | string;
  status: StatusArtefato;
  dias_decorridos: number | null;
  ultimo_comentario: string | null;
  total_comentarios: number;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  data_conclusao: string | null;
  justificativa_atraso: string | null;
  comentarios?: ComentarioResumo[];
}

export interface ComentarioArtefato {
  id: number;
  artefato_id: number;
  conteudo: string;
  autor: string;
  criado_em: string;
}

export interface TramitacaoResumo {
  id: number;
  observacao: string;
  autor: string;
  data_hora: string;
}

export interface ProjetoListagem {
  id: number;
  nome: string;
  processo_sei: string;
  prioridade: PrioridadeProjeto;
  complexidade: ComplexidadeProjeto;
  status: StatusProjeto;
  criado_em: string;

  qtd_acoes_pdtic: number;
  qtd_itens_pacc: number;
  qtd_artefatos_total: number;
  qtd_artefatos_concluidos: number;

  artefatos_resumo: ArtefatoResumo[];

  nome_requisitante: string | null;
  nome_tecnico: string | null;
  nome_administrativo: string | null;

  data_envio_licitacao: string | null;
  situacao_licitacao_texto: string | null;

  tramitacoes_resumo: TramitacaoResumo[];
  total_tramitacoes: number;
}
