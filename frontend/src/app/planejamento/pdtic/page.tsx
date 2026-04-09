"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  BookOpen,
  ChevronDown,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  GitBranchPlus,
  FolderPlus,
  MoreVertical,
  Settings,
} from "lucide-react";
import { AcaoCard } from "@/components/pdtic/AcaoCard";
import { NovaAcaoModal } from "@/components/pdtic/NovaAcaoModal";
import { EditarAcaoModal } from "@/components/pdtic/EditarAcaoModal";
import { ExcluirAcaoDialog } from "@/components/pdtic/ExcluirAcaoDialog";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import {
  fetchPeriodos,
  fetchPainelPdtic,
  criarPeriodoPdtic,
  gerarRevisaoPdtic,
} from "@/lib/api";
import { formatarNomeRevisao } from "@/lib/formatters";
import type {
  PdticPeriodo,
  PdticPainelResponse,
  PdticAcao,
  StatusAcao,
} from "@/types/pdtic";
import { STATUS_ACAO_COLOR } from "@/types/pdtic";

/* ── Tipos ────────────────────────────────────────────────────────────── */

type FiltroAuditoria = "vigentes" | "todas" | "adicionadas" | "removidas";

const FILTRO_OPTIONS: { value: FiltroAuditoria; label: string }[] = [
  { value: "vigentes", label: "Visão Consolidada" },
  { value: "todas", label: "Histórico Completo" },
  { value: "adicionadas", label: "Adicionadas nesta Revisão" },
  { value: "removidas", label: "Removidas nesta Revisão" },
];

/* ── Dropdown de ações administrativas ────────────────────────────────── */

function AdminDropdown({
  onNovoPeriodo,
  onGerarRevisao,
  hasRevisao,
}: {
  onNovoPeriodo: () => void;
  onGerarRevisao: () => void;
  hasRevisao: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border
                   bg-background-card text-foreground-muted shadow-sm transition-all
                   hover:bg-background-secondary hover:text-foreground"
        title="Ações administrativas"
      >
        <Settings size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border
                     bg-background-card shadow-xl"
          style={{ animation: "modalIn 0.15s ease-out" }}
        >
          <button
            onClick={() => {
              onNovoPeriodo();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground
                       transition-colors hover:bg-background-secondary"
          >
            <FolderPlus size={15} className="text-foreground-muted" />
            Novo Período
          </button>
          {hasRevisao && (
            <button
              onClick={() => {
                onGerarRevisao();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-left text-sm text-foreground
                         transition-colors hover:bg-background-secondary"
            >
              <GitBranchPlus size={15} className="text-foreground-muted" />
              Gerar Nova Revisão
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modal de Novo Período ────────────────────────────────────────────── */

function NovoPeriodoModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [anoInicio, setAnoInicio] = useState(currentYear);
  const [anoFim, setAnoFim] = useState(currentYear + 3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (anoFim <= anoInicio) {
      showToast("error", "Ano final deve ser maior que o ano inicial.");
      return;
    }
    setSubmitting(true);
    try {
      await criarPeriodoPdtic({ ano_inicio: anoInicio, ano_fim: anoFim });
      showToast("success", `Período ${anoInicio}–${anoFim} criado com Versão Inicial!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar período.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <FolderPlus size={18} className="text-indigo-500" />
          Novo Período PDTIC
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                Ano Início
              </label>
              <input
                type="number"
                value={anoInicio}
                onChange={(e) => setAnoInicio(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background-card px-3 text-sm text-foreground outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                Ano Fim
              </label>
              <input
                type="number"
                value={anoFim}
                onChange={(e) => setAnoFim(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background-card px-3 text-sm text-foreground outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              />
            </div>
          </div>
          <p className="text-[11px] text-foreground-muted">
            Uma <strong>Versão Inicial</strong> será criada automaticamente.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-foreground-muted hover:bg-background-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 rounded-lg bg-indigo-500 px-4 text-xs font-bold text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Criar Período"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────── */

export default function PdticPage() {
  const [periodos, setPeriodos] = useState<PdticPeriodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null);
  const [painel, setPainel] = useState<PdticPainelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalAcao, setEditModalAcao] = useState<PdticAcao | null>(null);
  const [deleteDialogAcao, setDeleteDialogAcao] = useState<PdticAcao | null>(null);
  const [showNovoPeriodoModal, setShowNovoPeriodoModal] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusAcao | "todas">("todas");
  const [filtroAuditoria, setFiltroAuditoria] = useState<FiltroAuditoria>("vigentes");
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | null>(null);

  // Fetch períodos
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPeriodos();
        setPeriodos(data);
        if (data.length > 0) {
          const ativo = data.find((p) => p.ativo) ?? data[0];
          setSelectedPeriodoId(ativo.id);
        } else {
          setLoading(false);
        }
      } catch {
        setError("Erro ao carregar períodos.");
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  // Fetch painel
  useEffect(() => {
    if (selectedPeriodoId === null) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPainelPdtic(
          selectedPeriodoId!,
          selectedRevisaoId ?? undefined,
          filtroAuditoria
        );
        setPainel(data);
        if (selectedRevisaoId === null && data.revisoes.length > 0) {
          setSelectedRevisaoId(data.revisoes[data.revisoes.length - 1].id);
        }
      } catch {
        setError("Erro ao carregar painel.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedPeriodoId, selectedRevisaoId, filtroAuditoria, fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  // Filtro local (busca + status)
  const acoesFiltradas = useMemo(() => {
    if (!painel) return [];
    const todas: PdticAcao[] = [...painel.acoes_ativas, ...painel.acoes_excluidas];
    return todas.filter((acao) => {
      const matchSearch =
        searchTerm === "" ||
        acao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acao.codigo_acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acao.unidade_demandante.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "todas" || acao.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [painel, searchTerm, statusFilter]);

  const selectedPeriodo = periodos.find((p) => p.id === selectedPeriodoId);

  const anosRange = useMemo(() => {
    if (!selectedPeriodo) return [2024, 2025, 2026, 2027];
    const anos: number[] = [];
    for (let y = selectedPeriodo.ano_inicio; y <= selectedPeriodo.ano_fim; y++) anos.push(y);
    return anos;
  }, [selectedPeriodo]);

  const totalAtivas = painel?.acoes_ativas.length ?? 0;
  const totalExcluidas = painel?.acoes_excluidas.length ?? 0;
  const totalRevisoes = painel?.revisoes.length ?? 0;

  async function handleGerarRevisao() {
    if (!selectedPeriodoId) return;
    try {
      const novaRev = await gerarRevisaoPdtic(selectedPeriodoId);
      showToast("success", `${formatarNomeRevisao(novaRev.numero_revisao)} gerada com sucesso!`);
      setSelectedRevisaoId(novaRev.id);
      refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao gerar revisão.");
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:from-indigo-500/20 dark:to-indigo-500/10 dark:text-indigo-400">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">PDTIC</h1>
            <p className="text-sm text-foreground-muted">
              Plano Diretor de Tecnologia da Informação e Comunicação
            </p>
          </div>
        </div>

        {/* Ações do cabeçalho — apenas "Nova Ação" como primário */}
        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          {periodos.length > 0 && (
            <div className="relative">
              <select
                value={selectedPeriodoId ?? ""}
                onChange={(e) => {
                  setSelectedPeriodoId(Number(e.target.value));
                  setSelectedRevisaoId(null);
                }}
                className="h-9 appearance-none rounded-lg border border-border bg-background-card
                           pl-3 pr-7 text-xs font-medium text-foreground shadow-sm outline-none
                           transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {periodos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ano_inicio}–{p.ano_fim}{p.ativo ? " ✦" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
            </div>
          )}

          {/* Botão primário: Nova Ação */}
          <button
            onClick={() => setModalOpen(true)}
            disabled={!painel || painel.revisoes.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-4
                       text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                       transition-all hover:bg-brand-primary-hover hover:shadow-xl
                       hover:shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            Nova Ação
          </button>

          {/* Dropdown de ações administrativas (⚙️) */}
          <AdminDropdown
            onNovoPeriodo={() => setShowNovoPeriodoModal(true)}
            onGerarRevisao={handleGerarRevisao}
            hasRevisao={!!selectedPeriodoId && !!painel}
          />
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      {painel && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Ativas</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalAtivas}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Excluídas</div>
            <div className="text-xl font-bold text-red-500 dark:text-red-400">{totalExcluidas}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Revisões</div>
            <div className="text-xl font-bold text-foreground">{totalRevisoes}</div>
          </div>
        </div>
      )}

      {/* ── Segmented Control – Revisões ────────────────────────── */}
      {painel && painel.revisoes.length > 0 && (
        <div className="rounded-lg border border-border bg-background-card p-1 shadow-sm">
          <div className="flex gap-0.5 overflow-x-auto">
            {painel.revisoes.map((rev) => {
              const isSelected = rev.id === selectedRevisaoId;
              return (
                <button
                  key={rev.id}
                  onClick={() => setSelectedRevisaoId(rev.id)}
                  className={`relative min-w-max rounded-md px-4 py-2 text-xs font-medium transition-all whitespace-nowrap
                    ${
                      isSelected
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-foreground-muted hover:bg-background-secondary hover:text-foreground"
                    }`}
                >
                  {formatarNomeRevisao(rev.numero_revisao)}
                  {rev.data_aprovacao && (
                    <span className={`ml-1.5 ${isSelected ? "text-white/70" : "text-foreground-muted/60"}`}>
                      {rev.data_aprovacao}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Barra de Filtros Unificada ──────────────────────────── */}
      {painel && (
        <div className="flex items-center gap-px rounded-lg border border-border bg-background-card shadow-sm overflow-hidden">
          {/* Busca */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Buscar ações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full bg-transparent pl-9 pr-4 text-sm text-foreground
                         placeholder:text-foreground-muted/60 outline-none"
            />
          </div>

          {/* Divisor */}
          <div className="h-5 w-px bg-border" />

          {/* Filtro de auditoria */}
          <div className="relative">
            <select
              value={filtroAuditoria}
              onChange={(e) => setFiltroAuditoria(e.target.value as FiltroAuditoria)}
              className="h-10 appearance-none bg-transparent px-3 pr-7 text-xs font-medium
                         text-foreground outline-none cursor-pointer"
            >
              {FILTRO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
          </div>

          {/* Divisor */}
          <div className="h-5 w-px bg-border" />

          {/* Filtro de status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusAcao | "todas")}
              className="h-10 appearance-none bg-transparent px-3 pr-7 text-xs font-medium
                         text-foreground outline-none cursor-pointer"
            >
              <option value="todas">Todos os status</option>
              {(Object.keys(STATUS_ACAO_COLOR) as StatusAcao[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
          </div>
        </div>
      )}

      {/* ── Lista de ações ──────────────────────────────────────── */}
      {!loading && periodos.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-center">
          <BookOpen size={36} className="text-foreground-muted mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground-muted">Nenhum período PDTIC cadastrado</p>
          <button
            onClick={() => setShowNovoPeriodoModal(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400"
          >
            <FolderPlus size={14} />
            Criar primeiro período
          </button>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : error && !painel ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-red-500">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : acoesFiltradas.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-sm text-foreground-muted">
          Nenhuma ação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-2.5">
          {acoesFiltradas.map((acao) => (
            <AcaoCard
              key={acao.id}
              acao={acao}
              revisoes={painel?.revisoes ?? []}
              revisaoAtualId={selectedRevisaoId}
              onEditar={(a) => setEditModalAcao(a)}
              onExcluir={(a) => setDeleteDialogAcao(a)}
            />
          ))}
        </div>
      )}

      {/* ── Modais ──────────────────────────────────────────────── */}

      {showNovoPeriodoModal && (
        <NovoPeriodoModal
          onClose={() => setShowNovoPeriodoModal(false)}
          onSuccess={refresh}
        />
      )}

      {selectedPeriodoId && painel && (
        <NovaAcaoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          periodoId={selectedPeriodoId}
          revisoes={painel.revisoes}
          anosRange={anosRange}
          onSuccess={refresh}
        />
      )}

      {editModalAcao && painel && (
        <EditarAcaoModal
          open={!!editModalAcao}
          onClose={() => setEditModalAcao(null)}
          acao={editModalAcao}
          revisoes={painel.revisoes}
          anosRange={anosRange}
          onSuccess={refresh}
        />
      )}

      {deleteDialogAcao && painel && (
        <ExcluirAcaoDialog
          open={!!deleteDialogAcao}
          onClose={() => setDeleteDialogAcao(null)}
          acao={deleteDialogAcao}
          revisoes={painel.revisoes}
          onSuccess={refresh}
        />
      )}

      <ToastContainer />
    </div>
  );
}
