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
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    handleUnauthorized(res);
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function poster<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleUnauthorized(res);
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

async function patcher<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleUnauthorized(res);
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

/* ── PDTIC ──────────────────────────────────────────────────────────────── */

import type { PdticPeriodo, PdticRevisao, PdticPainelResponse, PdticAcao } from "@/types/pdtic";

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

import type { PaccExercicio, PaccRevisao, PaccPainelResponse as PaccPainel } from "@/types/pacc";

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

export async function criarProjeto(payload: unknown): Promise<ProjetoBase> {
  return poster<ProjetoBase>("/projetos", payload);
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

export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetcher<DashboardResponse>("/dashboard/visaogeral");
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

/** Busca projetos e filtra apenas os com status 'Licitação concluída' */
export async function fetchProjetosLicitados(): Promise<ProjetoListagem[]> {
  const todos = await fetcher<ProjetoListagem[]>("/projetos");
  return todos.filter((p) => p.status === "Licitação concluída");
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

