"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileSignature,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Inbox,
  Filter,
} from "lucide-react";
import { ContratoCard } from "@/components/contratos/ContratoCard";
import { NovoContratoModal } from "@/components/contratos/NovoContratoModal";
import { DetalheContratoModal } from "@/components/contratos/DetalheContratoModal";
import { ToastContainer } from "@/components/ui/Toast";
import { fetchContratos, fetchContrato } from "@/lib/api";
import { formatarMoedaBRL } from "@/lib/formatters";
import type { ContratoListagem, ContratoResponse, SituacaoContrato } from "@/types/contrato";

/* ── Página ────────────────────────────────────────────────────────────── */

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoListagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState<string>("todos");

  // Modals
  const [showNovo, setShowNovo] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [editContratoData, setEditContratoData] = useState<ContratoResponse | null>(null);

  const handleEditar = async (id: number) => {
    try {
      const data = await fetchContrato(id);
      setEditContratoData(data);
    } catch {
      console.error("Erro ao carregar contrato para edição");
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchContratos();
        setContratos(data);
        setUsingMock(false);
      } catch {
        console.warn("Backend indisponível — lista vazia");
        setContratos([]);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  const refresh = () => setFetchKey((k) => k + 1);

  // ── Filtros aplicados ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = contratos;

    // Busca textual
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.numero_contrato.toLowerCase().includes(q) ||
          c.empresa_contratada.toLowerCase().includes(q) ||
          (c.projeto_nome ?? "").toLowerCase().includes(q) ||
          (c.nome_gestor ?? "").toLowerCase().includes(q)
      );
    }

    // Filtro por situação
    if (filterSituacao !== "todos") {
      result = result.filter((c) => c.situacao_atual === filterSituacao);
    }

    return result;
  }, [contratos, search, filterSituacao]);

  // ── Métricas rápidas ──────────────────────────────────────────────────
  const totalVigentes = contratos.filter((c) => c.situacao_atual === "Vigente").length;
  const totalValor = contratos.reduce((sum, c) => sum + c.valor_total, 0);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25">
            <FileSignature size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gestão de Contratos
            </h1>
            <p className="text-xs text-foreground-muted">
              Execução e fiscalização de contratos de TI
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNovo(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30 hover:brightness-110"
        >
          <Plus size={16} />
          Novo Contrato
        </button>
      </div>

      {/* Mock Banner */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle size={16} />
          Back-end indisponível — nenhum contrato carregado.
        </div>
      )}

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Total de Contratos
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {contratos.length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Vigentes
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalVigentes}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Valor Total Investido
          </div>
          <div className="mt-1 text-lg font-bold text-foreground font-mono">
            {formatarMoedaBRL(totalValor)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Exibindo
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {filtered.length}
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            placeholder="Buscar por nº contrato, empresa, projeto ou gestor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background-card pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-foreground-muted" />
          <select
            value={filterSituacao}
            onChange={(e) => setFilterSituacao(e.target.value)}
            className="h-10 appearance-none rounded-xl border border-border bg-background-card px-3 pr-8 text-sm text-foreground outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          >
            <option value="todos">Todas as situações</option>
            <option value="Vigente">✅ Vigente</option>
            <option value="Extinto">⛔ Extinto</option>
            <option value="Extinto, mas suporte vigente">⚠️ Ext. c/ suporte</option>
          </select>
        </div>
      </div>

      {/* Contratos Grid */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-cyan-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Inbox size={36} className="text-foreground-muted mb-2" />
          <p className="text-sm font-medium text-foreground-muted">
            {contratos.length === 0
              ? "Nenhum contrato cadastrado"
              : "Nenhum contrato encontrado com os filtros aplicados"}
          </p>
          {contratos.length === 0 && (
            <button
              onClick={() => setShowNovo(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-700 transition-colors hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:hover:bg-cyan-900/40"
            >
              <Plus size={14} />
              Cadastrar primeiro contrato
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <ContratoCard
              key={c.id}
              contrato={c}
              onVerDetalhes={(id) => setSelectedContratoId(id)}
              onEditar={handleEditar}
            />
          ))}
        </div>
      )}

      {/* Modal Novo Contrato */}
      {showNovo && (
        <NovoContratoModal
          onClose={() => setShowNovo(false)}
          onSuccess={refresh}
        />
      )}

      {/* Modal Detalhe do Contrato */}
      {selectedContratoId !== null && (
        <DetalheContratoModal
          contratoId={selectedContratoId}
          onClose={() => setSelectedContratoId(null)}
        />
      )}

      {/* Modal Editar Contrato */}
      {editContratoData && (
        <NovoContratoModal
          onClose={() => setEditContratoData(null)}
          onSuccess={refresh}
          initialData={editContratoData}
        />
      )}

      <ToastContainer />
    </div>
  );
}
