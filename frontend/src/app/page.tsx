"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  TrendingUp,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { ComplexidadeChart } from "@/components/dashboard/ComplexidadeChart";
import { GargalosChart } from "@/components/dashboard/GargalosChart";
import { fetchDashboard } from "@/lib/api";
import type { DashboardResponse } from "@/types/dashboard";

/* ── Dados mock para fallback ──────────────────────────────────────────── */

const MOCK_DATA: DashboardResponse = {
  pdtic: {
    periodo_vigente: "2024-2027",
    total_acoes_ativas: 24,
    distribuicao_status: {
      "Não iniciada": 5,
      "Em andamento": 9,
      "Contratada": 4,
      "Contrato vigente": 4,
      "Contrato a ser renovado": 2,
    },
  },
  pacc: {
    exercicio_vigente: 2025,
    total_itens_ativos: 18,
    valor_total_estimado: 5325000.0,
  },
  projetos: {
    total_projetos_ativos: 7,
    total_artefatos: 35,
    artefatos_concluidos: 19,
    distribuicao_complexidade: { baixa: 2, media: 3, alta: 2 },
    gargalos_artefatos: [
      { tipo: "ETP", quantidade: 3 },
      { tipo: "TR", quantidade: 2 },
      { tipo: "DFD", quantidade: 1 },
      { tipo: "Estimativa de Custos e Orçamento", quantidade: 1 },
    ],
  },
};

/* ── Formatação de valor monetário ─────────────────────────────────────── */

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

/* ── Página ────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchDashboard();
        setData(res);
      } catch {
        console.warn("Backend indisponível — usando dados mock");
        setData(MOCK_DATA);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (!data) return null;

  const progressoPct =
    data.projetos.total_artefatos > 0
      ? Math.round(
          (data.projetos.artefatos_concluidos / data.projetos.total_artefatos) *
            100
        )
      : 0;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/25">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-sm text-foreground-muted">
            Painel de indicadores do sistema ITER TIC
          </p>
        </div>
      </div>

      {/* Mock banner */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle size={16} />
          Back-end indisponível — exibindo dados de demonstração.
        </div>
      )}

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Ações PDTIC"
          value={String(data.pdtic.total_acoes_ativas)}
          subtitle={
            data.pdtic.periodo_vigente
              ? `Período ${data.pdtic.periodo_vigente}`
              : "Sem período ativo"
          }
          icon={<FileText size={20} />}
          gradient="from-indigo-500 to-blue-500"
          iconBg="from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-indigo-500/10"
        />
        <KpiCard
          title="Valor Total PACC"
          value={formatCurrency(data.pacc.valor_total_estimado)}
          subtitle={
            data.pacc.exercicio_vigente
              ? `Exercício ${data.pacc.exercicio_vigente} • ${data.pacc.total_itens_ativos} itens`
              : "Sem exercício ativo"
          }
          icon={<TrendingUp size={20} />}
          gradient="from-emerald-500 to-teal-500"
          iconBg="from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10"
        />
        <KpiCard
          title="Projetos Ativos"
          value={String(data.projetos.total_projetos_ativos)}
          subtitle="Em elaboração ou prontos"
          icon={<FolderKanban size={20} />}
          gradient="from-violet-500 to-purple-500"
          iconBg="from-violet-500/10 to-violet-500/5 dark:from-violet-500/20 dark:to-violet-500/10"
        />
        <KpiCard
          title="Artefatos Concluídos"
          value={`${data.projetos.artefatos_concluidos}/${data.projetos.total_artefatos}`}
          subtitle={`${progressoPct}% completo`}
          icon={<CheckCircle2 size={20} />}
          gradient="from-amber-500 to-orange-500"
          iconBg="from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/10"
          progress={progressoPct}
        />
      </div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar Chart - PDTIC Status */}
        <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-blue-500" />
            <h2 className="text-sm font-bold text-foreground">
              Distribuição de Status — PDTIC
            </h2>
          </div>
          <p className="text-xs text-foreground-muted mb-4">
            Ações ativas no período{" "}
            {data.pdtic.periodo_vigente ?? "vigente"}
          </p>
          <StatusChart data={data.pdtic.distribuicao_status} />
        </div>

        {/* Donut Chart - Complexidade */}
        <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-violet-500" />
            <h2 className="text-sm font-bold text-foreground">
              Complexidade dos Projetos
            </h2>
          </div>
          <p className="text-xs text-foreground-muted mb-4">
            Distribuição por classificação de risco
          </p>
          <ComplexidadeChart
            data={data.projetos.distribuicao_complexidade}
          />
        </div>
      </div>

      {/* ═══ Gargalos Section ═══ */}
      <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-amber-500" />
          <h2 className="text-sm font-bold text-foreground">
            Gargalos de Artefatos
          </h2>
        </div>
        <p className="text-xs text-foreground-muted mb-4">
          Artefatos com status &quot;Iniciado&quot; — identifica onde os projetos
          estão travando na fase interna
        </p>
        <GargalosChart data={data.projetos.gargalos_artefatos} />
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────────────── */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  iconBg,
  progress,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  progress?: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-background-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border-hover">
      {/* Decorative gradient glow */}
      <div
        className={`absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br ${iconBg} opacity-60 transition-transform duration-500 group-hover:scale-125`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-[11px] text-foreground-muted">{subtitle}</p>

          {/* Mini progress bar */}
          {progress !== undefined && (
            <div className="mt-2 h-1.5 w-full max-w-[120px] rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progress === 100
                    ? "bg-emerald-500"
                    : progress >= 50
                      ? "bg-amber-400"
                      : "bg-blue-400"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
