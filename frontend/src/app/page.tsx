"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  FolderKanban,
  Hourglass,
  CheckCircle2,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import dynamic from "next/dynamic";

/* ── Lazy-load dos gráficos (SSR off) ─────────────────────────────────── */

const EfetividadeFinanceiraChart = dynamic(
  () => import("@/components/dashboard/EfetividadeFinanceiraChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center text-xs text-slate-400">
        Carregando gráfico…
      </div>
    ),
  }
);

const DistribuicaoContratosChart = dynamic(
  () => import("@/components/dashboard/DistribuicaoContratosChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center text-xs text-slate-400">
        Carregando gráfico…
      </div>
    ),
  }
);

const TempoArtefatosChart = dynamic(
  () => import("@/components/dashboard/TempoArtefatosChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
        Carregando gráfico…
      </div>
    ),
  }
);

const CargaEquipeChart = dynamic(
  () => import("@/components/dashboard/CargaEquipeChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center text-xs text-slate-400">
        Carregando gráfico…
      </div>
    ),
  }
);

import { fetchKpis, type KpisDashboard } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE — PÁGINA
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [kpis, setKpis] = useState<KpisDashboard | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    setMounted(true);
    async function loadKpis() {
      try {
        const data = await fetchKpis();
        setKpis(data);
      } catch (err) {
        console.error("Erro ao carregar KPIs:", err);
      } finally {
        setLoadingKpis(false);
      }
    }
    loadKpis();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1440px] space-y-6 p-6 lg:p-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Painel de Indicadores
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Visão executiva
            </p>
          </div>
        </div>

        {/* ═══════ LINHA 1 — KPIs Críticos ═══════ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loadingKpis || !kpis ? (
            <>
              <div className="h-28 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
              <div className="h-28 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
              <div className="h-28 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
              <div className="h-28 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
            </>
          ) : (
            <>
              {/* Card 1 — Ações PDTIC */}
              <KpiCard
                title="Ações PDTIC"
                value={String(kpis.total_pdtic)}
                subtitle="Ações ativas no período vigente"
                icon={<CheckCircle2 size={20} />}
                accentColor="emerald"
              />

              {/* Card 2 — Projetos Fase Interna */}
              <KpiCard
                title="Fase interna"
                value={String(kpis.projetos_fase_interna)}
                subtitle="Em elaboração de artefatos"
                icon={<FolderKanban size={20} />}
                accentColor="indigo"
              />

              {/* Card 3 — Em Licitação */}
              <KpiCard
                title="Fase externa"
                value={String(kpis.projetos_fase_externa)}
                subtitle="Projetos na fase externa"
                icon={<Hourglass size={20} />}
                accentColor="cyan"
              />

              {/* Card 4 — Contratos Ativos */}
              <KpiCard
                title="Contratos Ativos"
                value={String(kpis.contratos_ativos)}
                subtitle="Contratos vigentes"
                icon={<AlertTriangle size={20} />}
                accentColor="rose"
              />
            </>
          )}
        </div>

        {/* ═══════ LINHA 2 — Financeiro e Contratos ═══════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Efetividade Financeira */}
          <ChartCard
            title="Efetividade Financeira (PDTIC vs Contratos)"
            subtitle="Comparação entre estimativa inicial e custo efetivo por ação"
            icon={<TrendingUp size={14} className="text-emerald-500" />}
          >
            {mounted && (
              <EfetividadeFinanceiraChart data={[]} />
            )}
          </ChartCard>

          {/* Distribuição de Contratos */}
          <ChartCard
            title="Distribuição de Contratos"
            subtitle="Por tipo de contratação e situação atual"
            icon={<BarChart3 size={14} className="text-indigo-500" />}
          >
            {mounted && (
              <DistribuicaoContratosChart data={{ porTipo: [], porSituacao: [] }} />
            )}
          </ChartCard>
        </div>

        {/* ═══════ LINHA 3 — Gargalos Operacionais ═══════ */}
        <ChartCard
          title="Tempo Médio de Elaboração de Artefatos (Dias)"
          subtitle="Identifica as etapas mais demoradas na fase interna dos projetos"
          icon={<Clock size={14} className="text-amber-500" />}
        >
          {mounted && (
            <TempoArtefatosChart data={[]} />
          )}
          {/* Mini-cards com médias */}
          <div className="mt-4 flex flex-wrap gap-3">
            <MiniStat label="Média Fase Interna" value="45 dias" color="indigo" />
            <MiniStat label="Média Fase Externa" value="90 dias" color="violet" />
          </div>
        </ChartCard>

        {/* ═══════ LINHA 4 — Carga de Trabalho ═══════ */}
        <ChartCard
          title="Participação da Equipe (Fase interna vs Gestão de contratos)"
          subtitle="Carga de trabalho distribuída entre fase interna e gestão de contratos"
          icon={<Users size={14} className="text-blue-500" />}
        >
          {mounted && (
            <CargaEquipeChart data={[]} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTES
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── KPI Card ─────────────────────────────────────────────────────────── */

const ACCENT_MAP: Record<string, { gradient: string; glow: string; bg: string; text: string; border: string }> = {
  rose: {
    gradient: "from-rose-500 to-pink-500",
    glow: "shadow-rose-500/25",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800/50",
  },
  indigo: {
    gradient: "from-indigo-500 to-blue-500",
    glow: "shadow-indigo-500/25",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800/50",
  },
  cyan: {
    gradient: "from-cyan-500 to-teal-500",
    glow: "shadow-cyan-500/25",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800/50",
  },
  emerald: {
    gradient: "from-emerald-500 to-green-500",
    glow: "shadow-emerald-500/25",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/50",
  },
};

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  progress,
  pulse,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  progress?: number;
  pulse?: boolean;
}) {
  const accent = ACCENT_MAP[accentColor] ?? ACCENT_MAP.indigo;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-900 ${accent.border}`}
    >
      {/* Decorative glow */}
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${accent.bg} opacity-70 transition-transform duration-500 group-hover:scale-150`}
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>

          {progress !== undefined && (
            <div className="mt-3 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${accent.gradient}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent.gradient} text-white shadow-lg ${accent.glow}`}
        >
          {pulse && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
            </span>
          )}
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Chart Card Wrapper ───────────────────────────────────────────────── */

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        {subtitle}
      </p>
      {children}
    </div>
  );
}

/* ── MiniStat badge ───────────────────────────────────────────────────── */

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50",
    violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/50",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold ${colorMap[color] ?? colorMap.indigo}`}
    >
      <span className="text-slate-500 dark:text-slate-400 font-normal">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
