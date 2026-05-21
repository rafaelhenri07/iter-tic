"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Inbox,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProjetoRow } from "@/components/projetos/ProjetoRow";

import { GerenciarArtefatoModal } from "@/components/projetos/GerenciarArtefatoModal";
import { ToastContainer } from "@/components/ui/Toast";
import { fetchProjetos } from "@/lib/api";
import type { ProjetoListagem, StatusProjeto, ArtefatoResumo, PrioridadeProjeto } from "@/types/projeto";
import { ProjetosSkeleton } from "@/components/ui/Skeleton";

/* ── Filtros de status ─────────────────────────────────────────────────── */

const STATUS_OPTIONS: { label: string; value: StatusProjeto | "todos" }[] = [
  { label: "Todos os status", value: "todos" },
  { label: "Fase interna", value: "Fase interna" },
  { label: "Fase externa", value: "Fase externa" },
  { label: "Contratado", value: "Contratado" },
];

const PRIORIDADE_OPTIONS: { label: string; value: PrioridadeProjeto | "todas" }[] = [
  { label: "Todas as prioridades", value: "todas" },
  { label: "Baixa", value: "baixa" },
  { label: "Média", value: "media" },
  { label: "Alta", value: "alta" },
];

const TIPO_OPTIONS: { label: string; value: "todos" | "nova" | "legado" }[] = [
  { label: "Todos os tipos", value: "todos" },
  { label: "Projetos Atuais", value: "nova" },
  { label: "Projetos Anteriores", value: "legado" },
];

/* ── Página principal ──────────────────────────────────────────────────── */

export default function ProjetosPage() {
  const router = useRouter();
  const [projetos, setProjetos] = useState<ProjetoListagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Modais

  const [artefatoModal, setArtefatoModal] = useState<{ projetoId: number; artefato: ArtefatoResumo } | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusProjeto | "todos">(
    "todos"
  );
  const [prioridadeFilter, setPrioridadeFilter] = useState<PrioridadeProjeto | "todas">(
    "todas"
  );
  const [tipoFilter, setTipoFilter] = useState<"todos" | "nova" | "legado">("todos");

  // Fetch
  useEffect(() => {
    async function load() {
      try {
        setErro(false);
        const data = await fetchProjetos();
        setProjetos(data);
      } catch {
        console.error("Erro ao carregar projetos do backend.");
        setProjetos([]);
        setErro(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  // Filtragem
  const projetosFiltrados = useMemo(() => {
    let resultado = projetos;

    if (statusFilter !== "todos") {
      resultado = resultado.filter((p) => p.status === statusFilter);
    }

    if (prioridadeFilter !== "todas") {
      resultado = resultado.filter((p) => p.prioridade === prioridadeFilter);
    }

    if (tipoFilter !== "todos") {
      resultado = resultado.filter((p) =>
        tipoFilter === "legado" ? p.is_legado : !p.is_legado
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.processo_sei.toLowerCase().includes(term) ||
          (p.nome_requisitante ?? "").toLowerCase().includes(term) ||
          (p.nome_tecnico ?? "").toLowerCase().includes(term)
      );
    }

    return resultado;
  }, [projetos, statusFilter, prioridadeFilter, tipoFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = projetos.length;
    const faseInterna = projetos.filter(
      (p) => p.status === "Fase interna"
    ).length;
    const faseExterna = projetos.filter(
      (p) => p.status === "Fase externa"
    ).length;
    const contratado = projetos.filter(
      (p) => p.status === "Contratado"
    ).length;
    return { total, faseInterna, faseExterna, contratado };
  }, [projetos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <FolderKanban size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Projetos
            </h1>
            <p className="text-sm text-foreground-muted">
              Projetos de contratação e artefatos da fase interna
            </p>
          </div>
        </div>

        <Link
          href="/projetos/novo"
          className="flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-xl hover:shadow-brand-primary/30"
        >
          <Plus size={16} />
          Novo Projeto
        </Link>
      </div>

      {/* Banner de erro */}
      {erro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle size={16} />
          Não foi possível conectar ao servidor. Verifique se o backend está ativo.
        </div>
      )}

      {/* Stats */}
      {!loading && projetos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-200">
              {stats.total}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fase Interna
            </div>
            <div className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.faseInterna}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fase Externa
            </div>
            <div className="mt-1 text-3xl font-bold text-brand-primary">
              {stats.faseExterna}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contratado
            </div>
            <div className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.contratado}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && projetos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SEI ou membro da equipe..."
              className="h-9 w-full rounded-lg border border-border bg-background-card pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusProjeto | "todos")}
            className="h-9 rounded-lg border border-border bg-background-card px-3 pr-8 text-sm text-foreground outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Prioridade dropdown */}
          <select
            value={prioridadeFilter}
            onChange={(e) => setPrioridadeFilter(e.target.value as PrioridadeProjeto | "todas")}
            className="h-9 rounded-lg border border-border bg-background-card px-3 pr-8 text-sm text-foreground outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
          >
            {PRIORIDADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Tipo de Projeto dropdown */}
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as "todos" | "nova" | "legado")}
            className="h-9 rounded-lg border border-border bg-background-card px-3 pr-8 text-sm text-foreground outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
          >
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ProjetosSkeleton />
      ) : projetos.length === 0 ? (
        /* Empty state */
        <div className="flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary mb-4">
            <Inbox size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            Nenhum projeto cadastrado
          </h3>
          <p className="text-sm text-foreground-muted max-w-sm text-center">
            Crie seu primeiro projeto de contratação para começar a gerenciar os
            artefatos da fase interna da licitação.
          </p>
          <Link
            href="/projetos/novo"
            className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg"
          >
            <Plus size={16} />
            Criar Primeiro Projeto
          </Link>
        </div>
      ) : projetosFiltrados.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-sm text-foreground-muted">
          <Filter size={16} className="mr-2" />
          Nenhum projeto encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm">
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Projeto
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Esteira de Artefatos
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status do Projeto
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Prioridade
                  </th>

                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {projetosFiltrados.map((p) => (
                  <ProjetoRow
                    key={p.id}
                    projeto={p}
                    onEditProjeto={(proj) => router.push(`/projetos/${proj.id}/editar`)}
                    onArtefatoClick={(pid, a) => setArtefatoModal({ projetoId: pid, artefato: a })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {artefatoModal && (
        <GerenciarArtefatoModal
          projetoId={artefatoModal.projetoId}
          artefato={artefatoModal.artefato}
          onClose={() => setArtefatoModal(null)}
          onSuccess={() => setFetchKey((k) => k + 1)}
        />
      )}

      <ToastContainer />
    </div>
  );
}
