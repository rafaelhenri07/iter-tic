/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — API Client
 *
 * Todas as requisições incluem automaticamente o token JWT do cookie
 * e redirecionam para /login quando recebem 401 (sessão expirada).
 * ────────────────────────────────────────────────────────────────────────── */

import Cookies from "js-cookie";
import type { ComentarioArtefato } from "@/types/projeto";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Retorna os headers de autenticação com o token JWT.
 * Se não houver token, retorna headers vazios (a API retornará 401).
 */
function getAuthHeaders(): Record<string, string> {
  const token = Cookies.get("itertic_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Trata respostas 401 (não autorizado) removendo cookies e
 * redirecionando para a tela de login.
 */
function handleUnauthorized(res: Response): void {
  if (res.status === 401 && typeof window !== "undefined") {
    Cookies.remove("itertic_token");
    Cookies.remove("itertic_user");
    window.location.href = "/login";
  }
}

async function fetcher<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: { ...getAuthHeaders() },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.");
  }
  if (!res.ok) {
    handleUnauthorized(res);
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function poster<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.");
  }
  if (!res.ok) {
    handleUnauthorized(res);
    const detail = await res.text().catch(() => res.statusText);
    // Tentar extrair mensagem de detalhe do JSON de erro do FastAPI
    try {
      const parsed = JSON.parse(detail);
      const msg = parsed?.detail ?? detail;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== detail) throw parseErr;
      throw new Error(detail);
    }
  }
  return res.json() as Promise<T>;
}

async function patcher<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.");
  }
  if (!res.ok) {
    handleUnauthorized(res);
    const detail = await res.text().catch(() => res.statusText);
    try {
      const parsed = JSON.parse(detail);
      const msg = parsed?.detail ?? detail;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== detail) throw parseErr;
      throw new Error(detail);
    }
  }
  return res.json() as Promise<T>;
}

async function deleter<T = void>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    const options: RequestInit = {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    };
    if (body) {
      options.headers = { ...options.headers, "Content-Type": "application/json" };
      options.body = JSON.stringify(body);
    }
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.");
  }
  if (!res.ok) {
    handleUnauthorized(res);
    const detail = await res.text().catch(() => res.statusText);
    try {
      const parsed = JSON.parse(detail);
      const msg = parsed?.detail ?? detail;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== detail) throw parseErr;
      throw new Error(detail);
    }
  }
  if (res.status === 204) return undefined as any as T;
  return res.json() as Promise<T>;
}


/* ── PDTIC ──────────────────────────────────────────────────────────────── */

import type {
  PdticPeriodo,
  PdticRevisao,
  PdticPainelResponse,
  PdticAcao,
  PdticAcaoComHistoricoResponse,
} from "@/types/pdtic";

export async function fetchPeriodos(): Promise<PdticPeriodo[]> {
  return fetcher<PdticPeriodo[]>("/pdtic/periodos");
}

export async function fetchPainelPdtic(
  periodoId: number,
  revisaoId?: number,
  filtroAuditoria?: string
): Promise<PdticPainelResponse> {
  const params = new URLSearchParams();
  if (revisaoId != null) params.set("revisao_id", String(revisaoId));
  if (filtroAuditoria) params.set("filtro_auditoria", filtroAuditoria);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return fetcher<PdticPainelResponse>(`/pdtic/${periodoId}/painel${qs}`);
}

export async function obterAcaoPdtic(
  acaoId: number
): Promise<PdticAcaoComHistoricoResponse> {
  return fetcher<PdticAcaoComHistoricoResponse>(`/pdtic/acoes/${acaoId}`);
}

export async function criarPeriodoPdtic(
  payload: { ano_inicio: number; ano_fim: number; ativo?: boolean }
): Promise<PdticPeriodo> {
  return poster<PdticPeriodo>("/pdtic/periodos", payload);
}

export async function gerarRevisaoPdtic(
  periodoId: number
): Promise<PdticRevisao> {
  return poster<PdticRevisao>(`/pdtic/periodos/${periodoId}/gerar-revisao`, {});
}

export async function criarAcaoPdtic(payload: unknown): Promise<PdticAcao> {
  return poster<PdticAcao>("/pdtic/acoes", payload);
}

export async function atualizarAcaoPdtic(
  acaoId: number,
  revisaoId: number,
  payload: unknown
): Promise<PdticAcao> {
  const res = await fetch(
    `${API_BASE}/pdtic/acoes/${acaoId}?revisao_id=${revisaoId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<PdticAcao>;
}

export async function excluirAcaoPdtic(
  acaoId: number,
  revisaoExclusaoId: number
): Promise<PdticAcao> {
  const res = await fetch(`${API_BASE}/pdtic/acoes/${acaoId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ revisao_exclusao_id: revisaoExclusaoId }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<PdticAcao>;
}

/* ── PACC ──────────────────────────────────────────────────────────────── */

import type { PaccExercicio, PaccRevisao, PaccPainelResponse as PaccPainel, PaccItemComHistoricoResponse } from "@/types/pacc";

export async function fetchExercicios(): Promise<PaccExercicio[]> {
  return fetcher<PaccExercicio[]>("/pacc/exercicios");
}

export async function fetchPainelPacc(
  exercicioId: number,
  revisaoId?: number,
  filtroAuditoria?: string
): Promise<PaccPainel> {
  const params = new URLSearchParams();
  if (revisaoId != null) params.set("revisao_id", String(revisaoId));
  if (filtroAuditoria) params.set("filtro_auditoria", filtroAuditoria);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return fetcher<PaccPainel>(`/pacc/${exercicioId}/painel${qs}`);
}

export async function obterItemPacc(itemId: number): Promise<PaccItemComHistoricoResponse> {
  return fetcher<PaccItemComHistoricoResponse>(`/pacc/itens/${itemId}`);
}

export async function criarExercicioPacc(
  payload: { ano: number; ativo?: boolean }
): Promise<PaccExercicio> {
  return poster<PaccExercicio>("/pacc/exercicios", payload);
}

export async function gerarRevisaoPacc(
  exercicioId: number
): Promise<PaccRevisao> {
  return poster<PaccRevisao>(`/pacc/exercicios/${exercicioId}/gerar-revisao`, {});
}

import type { PaccItem } from "@/types/pacc";

export async function criarItemPacc(payload: unknown): Promise<PaccItem> {
  return poster<PaccItem>("/pacc/itens", payload);
}

export async function atualizarItemPacc(
  itemId: number,
  revisaoId: number,
  payload: unknown
): Promise<PaccItem> {
  const res = await fetch(
    `${API_BASE}/pacc/itens/${itemId}?revisao_id=${revisaoId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<PaccItem>;
}

export async function excluirItemPacc(
  itemId: number,
  revisaoExclusaoId: number
): Promise<PaccItem> {
  const res = await fetch(`${API_BASE}/pacc/itens/${itemId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ revisao_exclusao_id: revisaoExclusaoId }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<PaccItem>;
}

/**
 * Busca ações PDTIC ativas de um período específico.
 * Usa `apenas_ativas=true` para alimentar o select relacional do formulário PACC.
 */
export async function fetchAcoesPdticAtivas(
  periodoId: number
): Promise<PdticAcao[]> {
  return fetcher<PdticAcao[]>(
    `/pdtic/${periodoId}/acoes?apenas_ativas=true`
  );
}

/* ── PROJETOS ──────────────────────────────────────────────────────────── */

import type {
  ProjetoListagem,
  ProjetoBase,
  ProjetoPainelResponse,
  Artefato,
  Servidor,
  ProjetoTramitacao,
} from "@/types/projeto";

export async function fetchProjetos(): Promise<ProjetoListagem[]> {
  return fetcher<ProjetoListagem[]>("/projetos");
}

export async function obterProjeto(projetoId: number): Promise<ProjetoBase> {
  return fetcher<ProjetoBase>(`/projetos/${projetoId}`);
}

export async function criarProjeto(payload: unknown): Promise<ProjetoBase> {
  return poster<ProjetoBase>("/projetos", payload);
}

export async function atualizarProjeto(projetoId: number, payload: unknown): Promise<ProjetoBase> {
  return patcher<ProjetoBase>(`/projetos/${projetoId}`, payload);
}

export async function inicializarArtefatos(
  projetoId: number
): Promise<Artefato[]> {
  return poster<Artefato[]>(`/projetos/${projetoId}/artefatos/inicializar`, {});
}

export async function fetchServidores(q?: string): Promise<Servidor[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return fetcher<Servidor[]>(`/projetos/servidores${qs}`);
}

export async function criarServidor(payload: Record<string, unknown>): Promise<Servidor> {
  return poster<Servidor>("/projetos/servidores", payload);
}

export async function atualizarServidor(
  id: number,
  payload: Record<string, unknown>
): Promise<Servidor> {
  return patcher<Servidor>(`/projetos/servidores/${id}`, payload);
}

export async function excluirServidor(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/projetos/servidores/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
}

export async function fetchPainelProjeto(
  projetoId: number
): Promise<ProjetoPainelResponse> {
  return fetcher<ProjetoPainelResponse>(`/projetos/${projetoId}/painel`);
}

export async function atualizarArtefato(
  artefatoId: number,
  payload: Record<string, unknown>
): Promise<Artefato> {
  const res = await fetch(
    `${API_BASE}/projetos/artefatos/${artefatoId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<Artefato>;
}

export async function alterarDataArtefato(
  artefatoId: number,
  payload: {
    artefato_id: number;
    tipo_data_alterada: string;
    data_antiga: string;
    data_nova: string;
    justificativa: string;
  }
): Promise<Artefato> {
  return poster<Artefato>(
    `/projetos/artefatos/${artefatoId}/alterar-data`,
    payload
  );
}

/* ── DASHBOARD ─────────────────────────────────────────────────────────── */

import type { DashboardResponse } from "@/types/dashboard";

export interface KpisDashboard {
  total_pdtic: number;
  projetos_fase_interna: number;
  projetos_fase_externa: number;
  contratos_ativos: number;
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetcher<DashboardResponse>("/dashboard/painel-indicadores");
}

export async function fetchKpis(): Promise<KpisDashboard> {
  return fetcher<KpisDashboard>("/dashboard/kpis");
}

export interface DistribuicaoTipoItem {
  name: string;
  value: number;
}

export interface DistribuicaoSituacaoItem {
  label: string;
  qtd: number;
}

export interface EfetividadeFinanceiraItem {
  acao: string;
  estimativa: number;
  efetivo: number;
}

export interface TempoArtefatoItem {
  artefato: string;
  dias: number;
}

export interface CargaEquipeItem {
  nome: string;
  planejamento: number;
  fiscalizacao: number;
}

export interface GraficosDashboard {
  distribuicao_contratos: {
    por_tipo: DistribuicaoTipoItem[];
    por_situacao: DistribuicaoSituacaoItem[];
  };
  efetividade_financeira: EfetividadeFinanceiraItem[];
  tempo_artefatos?: TempoArtefatoItem[];
  carga_equipe?: CargaEquipeItem[];
}

export async function fetchGraficos(): Promise<GraficosDashboard> {
  return fetcher<GraficosDashboard>("/dashboard/graficos");
}

/* ── LICITAÇÃO (Fase Externa) ──────────────────────────────────────────── */

export async function enviarParaLicitacao(projetoId: number): Promise<ProjetoBase> {
  return poster<ProjetoBase>(`/projetos/${projetoId}/enviar-licitacao`, {});
}

export async function atualizarTramiteLicitacao(
  projetoId: number,
  texto: string
): Promise<ProjetoBase> {
  return patcher<ProjetoBase>(`/projetos/${projetoId}/tramite-licitacao`, {
    situacao_licitacao_texto: texto,
  });
}

export async function concluirLicitacao(projetoId: number): Promise<ProjetoBase> {
  return poster<ProjetoBase>(`/projetos/${projetoId}/concluir-licitacao`, {});
}

export async function adicionarTramitacaoLicitacao(
  projetoId: number,
  observacao: string,
  autor?: string
): Promise<ProjetoTramitacao> {
  return poster(`/projetos/${projetoId}/tramitacoes`, {
    observacao,
    ...(autor ? { autor } : {}),
  });
}

/* ── CONTRATOS (Módulo 4) ──────────────────────────────────────────────── */

import type { ContratoListagem, ContratoResponse } from "@/types/contrato";

export async function fetchContratos(): Promise<ContratoListagem[]> {
  return fetcher<ContratoListagem[]>("/contratos");
}

export async function fetchContrato(id: number): Promise<ContratoResponse> {
  return fetcher<ContratoResponse>(`/contratos/${id}`);
}

export async function criarContrato(payload: Record<string, unknown>): Promise<ContratoResponse> {
  return poster<ContratoResponse>("/contratos", payload);
}

export async function atualizarContrato(
  id: number,
  payload: Record<string, unknown>,
): Promise<ContratoResponse> {
  return patcher<ContratoResponse>(`/contratos/${id}`, payload);
}

export async function adicionarObservacaoContrato(
  contratoId: number,
  conteudo: string,
): Promise<unknown> {
  return poster(`/contratos/${contratoId}/observacoes`, { conteudo });
}

export async function fetchAditivos(contratoId: number): Promise<import("@/types/contrato").Aditivo[]> {
  return fetcher(`/contratos/${contratoId}/aditivos`);
}

export async function criarAditivo(
  contratoId: number,
  payload: import("@/types/contrato").AditivoCreatePayload,
): Promise<import("@/types/contrato").Aditivo> {
  return poster(`/contratos/${contratoId}/aditivos`, payload);
}

/** Busca projetos e filtra apenas os com status 'Contratado' */
export async function fetchProjetosLicitados(): Promise<ProjetoListagem[]> {
  const todos = await fetcher<ProjetoListagem[]>("/projetos");
  return todos.filter((p) => p.status === "Contratado");
}

/* ── Comentários de Artefato ───────────────────────────────────────────── */

export async function listarComentariosArtefato(
  artefatoId: number
): Promise<ComentarioArtefato[]> {
  return fetcher<ComentarioArtefato[]>(
    `/projetos/artefatos/${artefatoId}/comentarios`
  );
}

export async function adicionarComentarioArtefato(
  artefatoId: number,
  conteudo: string,
  autor?: string
): Promise<ComentarioArtefato> {
  return poster(`/projetos/artefatos/${artefatoId}/comentarios`, {
    conteudo,
    ...(autor ? { autor } : {}),
  });
}


/* ── FABRICANTES ────────────────────────────────────────────────────────── */

export interface Fabricante {
  id: number;
  nome: string;
  site: string | null;
  contato_nome: string;
  contato_cargo: string;
  contato_telefone1: string;
  contato_telefone2: string | null;
  contato_email: string;
  create_time: string;
  update_time: string | null;
}

export interface FabricantePayload {
  nome: string;
  site?: string | null;
  contato_nome: string;
  contato_cargo: string;
  contato_telefone1: string;
  contato_telefone2?: string | null;
  contato_email: string;
}

export async function fetchFabricantes(): Promise<Fabricante[]> {
  return fetcher<Fabricante[]>("/fabricantes");
}

export async function fetchFabricante(id: number): Promise<Fabricante> {
  return fetcher<Fabricante>(`/fabricantes/${id}`);
}

export async function criarFabricante(payload: FabricantePayload): Promise<Fabricante> {
  return poster<Fabricante>("/fabricantes", payload);
}

export async function atualizarFabricante(
  id: number,
  payload: Partial<FabricantePayload>
): Promise<Fabricante> {
  return patcher<Fabricante>(`/fabricantes/${id}`, payload);
}

export async function excluirFabricante(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/fabricantes/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
}

/* ── EMPRESAS ───────────────────────────────────────────────────────────── */

export interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
  site: string | null;
  contato_nome: string;
  telefone: string;
  email: string;
  servicos_ofertados: string[];
  create_time: string;
  update_time: string | null;
}

export interface EmpresaPayload {
  nome: string;
  cnpj: string;
  site?: string | null;
  contato_nome: string;
  telefone: string;
  email: string;
  servicos_ofertados?: string[];
}

export async function fetchEmpresas(): Promise<Empresa[]> {
  return fetcher<Empresa[]>("/empresas");
}

export async function fetchEmpresa(id: number): Promise<Empresa> {
  return fetcher<Empresa>(`/empresas/${id}`);
}

export async function criarEmpresa(payload: EmpresaPayload): Promise<Empresa> {
  return poster<Empresa>("/empresas", payload);
}

export async function atualizarEmpresa(
  id: number,
  payload: Partial<EmpresaPayload>
): Promise<Empresa> {
  return patcher<Empresa>(`/empresas/${id}`, payload);
}

export async function excluirEmpresa(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/empresas/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
}

/* ── CONFIGURAÇÕES (White Label) ───────────────────────────────────────── */

export interface Configuracao {
  id: number;
  nome_orgao: string;
  cor_primaria: string;
  logo_url: string | null;
}

export async function fetchConfiguracao(): Promise<Configuracao> {
  return fetcher<Configuracao>("/configuracoes");
}

export async function updateConfiguracao(payload: Partial<Configuracao>): Promise<Configuracao> {
  return patcher<Configuracao>("/configuracoes", payload);
}

// ── Admin: Gestão de Usuários ──────────────────────────────────────────────

export interface UsuarioAdmin {
  id: number;
  nome: string;
  email: string;
  role: string;
  is_active: boolean;
  servidor_id: number | null;
  servidor: {
    id: number;
    nome: string;
    matricula: string;
    cargo: string;
    lotacao: string;
  } | null;
}

export interface UsuarioCreatePayload {
  nome: string;
  email: string;
  senha: string;
  role: string;
  servidor_id?: number | null;
}

export interface UsuarioUpdatePayload {
  nome?: string;
  role?: string;
  is_active?: boolean;
  servidor_id?: number | null;
}

export async function getUsuarios(): Promise<UsuarioAdmin[]> {
  return fetcher<UsuarioAdmin[]>("/usuarios");
}

export async function criarUsuario(payload: UsuarioCreatePayload): Promise<UsuarioAdmin> {
  const res = await fetch(`${API_BASE}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro ao criar usuário" }));
    throw new Error(err.detail ?? "Erro ao criar usuário");
  }
  return res.json();
}

export async function atualizarUsuario(id: number, payload: UsuarioUpdatePayload): Promise<UsuarioAdmin> {
  const res = await fetch(`${API_BASE}/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro ao atualizar usuário" }));
    throw new Error(err.detail ?? "Erro ao atualizar usuário");
  }
  return res.json();
}

export async function desativarUsuario(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/usuarios/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  handleUnauthorized(res);
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ detail: "Erro ao desativar usuário" }));
    throw new Error(err.detail ?? "Erro ao desativar usuário");
  }
}

// ── Admin: Auditoria ───────────────────────────────────────────────────────

export interface AuditoriaLog {
  id: number;
  user_id: number | null;
  user_email: string | null;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  detalhes: string | null;
  ip_address: string | null;
  rota: string | null;
  metodo_http: string | null;
  timestamp: string;
}

export interface PaginatedAuditoria {
  total: number;
  skip: number;
  limit: number;
  items: AuditoriaLog[];
}

export async function getAuditoriaLogs(skip = 0, limit = 100): Promise<PaginatedAuditoria> {
  return fetcher<PaginatedAuditoria>(`/auditoria?skip=${skip}&limit=${limit}`);
}

// ── Servidores (lista para selects) ───────────────────────────────────────

export interface ServidorItem {
  id: number;
  nome: string;
  matricula: string;
  cargo: string;
  lotacao: string;
}

export async function getServidores(): Promise<ServidorItem[]> {
  return fetcher<ServidorItem[]>("/projetos/servidores");
}

// ── Histórico e Diário de Bordo da Fase Externa ─────────────────────────────

export interface HistoricoEvento {
  id: string;
  data_evento: string;
  titulo: string;
  descricao: string;
  tipo: string;
  icone: string;
}

export async function fetchHistoricoProjeto(projetoId: number): Promise<HistoricoEvento[]> {
  return fetcher<HistoricoEvento[]>(`/projetos/${projetoId}/historico`);
}

export interface ObservacaoUsuario {
  id: number;
  nome: string;
}

export interface ObservacaoFaseExterna {
  id: number;
  projeto_id: number;
  texto: string;
  criado_em: string;
  usuario?: ObservacaoUsuario;
}

export async function fetchObservacoesFaseExterna(projetoId: number): Promise<ObservacaoFaseExterna[]> {
  return fetcher<ObservacaoFaseExterna[]>(`/projetos/${projetoId}/fase-externa/observacoes`);
}

export async function addObservacaoFaseExterna(projetoId: number, texto: string): Promise<ObservacaoFaseExterna> {
  return poster<ObservacaoFaseExterna>(`/projetos/${projetoId}/fase-externa/observacoes`, { texto });
}

/* ── Estrutura Organizacional (Unificada) ────────────────────────────────── */

import type { UnidadeOrg, UnidadeOrgCreatePayload } from "@/types/estrutura_organizacional";

export async function fetchUnidadesOrganizacionais(): Promise<UnidadeOrg[]> {
  return fetcher<UnidadeOrg[]>("/estrutura-organizacional/unidades");
}
export async function criarUnidadeOrganizacional(payload: UnidadeOrgCreatePayload): Promise<UnidadeOrg> {
  return poster<UnidadeOrg>("/estrutura-organizacional/unidades", payload);
}
export async function excluirUnidadeOrganizacional(id: number): Promise<void> {
  return deleter(`/estrutura-organizacional/unidades/${id}`);
}

