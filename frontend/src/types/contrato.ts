/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Tipagens TypeScript do Módulo 4: Contratos e Fiscalização
 * ────────────────────────────────────────────────────────────────────────── */

/* ── Enums ─────────────────────────────────────────────────────────────── */

export type TipoContrato = "Aquisição" | "Serviço continuado" | "Subscrição";

export type SituacaoContrato =
  | "Vigente"
  | "Extinto"
  | "Extinto, mas suporte vigente";

export type ModalidadeContrato = "CONTRATO" | "ARP";

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

export const MODALIDADE_CONTRATO_CONFIG: Record<
  ModalidadeContrato,
  { icon: string; label: string; cls: string }
> = {
  CONTRATO: {
    icon: "📄",
    label: "Contrato",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  ARP: {
    icon: "📑",
    label: "ARP",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
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

/* ── Equipe de Fiscalização (novo: Titular + Substitutos) ──────────────── */

export interface EquipePapelResponse {
  titular: ServidorResumo | null;
  substitutos: ServidorResumo[];
}

export interface EquipeFiscalizacao {
  gestor: EquipePapelResponse | null;
  fiscal_requisitante: EquipePapelResponse | null;
  fiscal_tecnico: EquipePapelResponse | null;
  fiscal_administrativo: EquipePapelResponse | null;
}

/* ── Equipe de Fiscalização (input para criação/edição) ────────────────── */

export interface EquipePapelInput {
  titular_id: number | null;
  substitutos_ids: number[];
}

export interface EquipeInput {
  gestor?: EquipePapelInput;
  fiscal_requisitante?: EquipePapelInput;
  fiscal_tecnico?: EquipePapelInput;
  fiscal_administrativo?: EquipePapelInput;
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

/* ── Itens do Contrato ─────────────────────────────────────────────────── */

export interface ItemContrato {
  id: number;
  contrato_id: number;
  objeto_contratado: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  tipo_catalogo: string | null;
  codigo_catalogo: string | null;
}

export interface ItemContratoPayload {
  objeto_contratado: string;
  quantidade: number;
  valor_unitario: number;
  tipo_catalogo?: string | null;
  codigo_catalogo?: string | null;
}

/* ── Contrato (resposta completa) ──────────────────────────────────────── */

export interface ContratoResponse {
  id: number;
  numero: number;
  ano: number;
  modalidade_contrato: ModalidadeContrato;
  orgao_gerenciador: string | null;
  projeto_id: number;
  empresa_id: number | null;
  empresa_nome: string | null;
  fabricante_id: number | null;
  fabricante_nome: string | null;
  tipo_contrato: TipoContrato;
  itens: ItemContrato[];
  valor_total: number;

  data_inicio_vigencia: string | null;
  vigencia_meses: number | null;
  prorrogacao_meses: number;
  data_assinatura: string;
  data_fim_vigencia: string;

  situacao_atual: SituacaoContrato;
  observacoes: string | null;

  criado_em: string;
  atualizado_em: string;

  projeto_origem: ProjetoOrigemResumo | null;
  acoes_pdtic_vinculadas: AcaoPdticResumo[];
  equipe: EquipeFiscalizacao | null;
  historico: HistoricoContrato[];
  aditivos: Aditivo[];
}

/* ── Contrato (listagem otimizada) ─────────────────────────────────────── */

export interface ContratoListagem {
  id: number;
  numero: number;
  ano: number;
  modalidade_contrato: ModalidadeContrato;
  empresa_id: number | null;
  empresa_nome: string | null;
  tipo_contrato: TipoContrato;
  situacao_atual: SituacaoContrato;
  valor_total: number;
  data_assinatura: string;
  data_fim_vigencia: string;
  projeto_nome: string | null;
  projeto_processo_sei: string | null;
  nome_gestor: string | null;
}

/* ── Aditivo de Prazo ───────────────────────────────────────────────────────── */

export interface Aditivo {
  id: number;
  contrato_id: number;
  numero_aditivo: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  criado_em: string;
}

export interface AditivoCreatePayload {
  numero_aditivo: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
}

/* ── Payload de criação ───────────────────────────────────────────────────────── */

export interface ContratoCreatePayload {
  projeto_id: number;
  numero: number;
  ano: number;
  modalidade_contrato: ModalidadeContrato;
  orgao_gerenciador?: string | null;
  empresa_id: number;
  fabricante_id?: number | null;
  tipo_contrato: TipoContrato;
  itens: ItemContratoPayload[];
  data_inicio_vigencia?: string | null;
  vigencia_meses?: number | null;
  prorrogacao_meses?: number;
  data_assinatura: string;
  data_fim_vigencia: string;
  situacao_atual: SituacaoContrato;
  observacoes?: string | null;
  equipe?: EquipeInput | null;
}



