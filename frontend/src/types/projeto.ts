/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens do Módulo 2: Projetos e Licitações
 * Espelha os schemas Pydantic do backend (app/schemas/projeto.py)
 * ────────────────────────────────────────────────────────────────────────── */

/* ── Enums ──────────────────────────────────────────────────────────────── */

export type ComplexidadeProjeto = "baixa" | "media" | "alta";

export type StatusProjeto =
  | "Em elaboração"
  | "Pronto para contratação"
  | "Em licitação"
  | "Licitação concluída"
  | "Suspenso"
  | "Cancelado";

export type TipoArtefato =
  | "DFD"
  | "ETP"
  | "Mapa de Riscos"
  | "Estimativa de Custos e Orçamento"
  | "TR";

export type StatusArtefato = "Não iniciado" | "Iniciado" | "Concluído";

export type TipoDataAlterada = "data_inicio" | "data_conclusao";

/* ── Labels / Colors ───────────────────────────────────────────────────── */

export const COMPLEXIDADE_CONFIG: Record<
  ComplexidadeProjeto,
  { label: string; cls: string }
> = {
  baixa: {
    label: "Baixa",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  media: {
    label: "Média",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  alta: {
    label: "Alta",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  },
};

export const STATUS_PROJETO_CONFIG: Record<
  StatusProjeto,
  { icon: string; cls: string }
> = {
  "Em elaboração": {
    icon: "🔧",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  "Pronto para contratação": {
    icon: "✅",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  "Em licitação": {
    icon: "📤",
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  },
  "Licitação concluída": {
    icon: "🏆",
    cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  },
  Suspenso: {
    icon: "⏸️",
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  Cancelado: {
    icon: "❌",
    cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
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

/* ── Servidor ──────────────────────────────────────────────────────────── */

export interface Servidor {
  id: number;
  matricula: string;
  nome: string;
  cargo: string;
  funcao: string | null;
  lotacao: string;
  perfil_acesso: string | null;
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
  data_conclusao: string | null;
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
  complexidade: ComplexidadeProjeto;
  status: StatusProjeto;
  catmat: string | null;
  catser: string | null;
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
  data_conclusao: string | null;
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
