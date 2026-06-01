"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Hourglass,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchStatsDashboard, type StatsDashboardResponse } from "@/lib/api";

const ACCENT_MAP: Record<
  string,
  { gradient: string; glow: string; bg: string; text: string; border: string }
> = {
  rose: {
    gradient: "from-rose-500 to-pink-500",
    glow: "shadow-rose-500/25",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800/50",
  },
  orange: {
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-orange-500/25",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800/50",
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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<StatsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const toggleServerExpand = (nomeCompleto: string) => {
    setExpandedServers((prev) => ({
      ...prev,
      [nomeCompleto]: !prev[nomeCompleto],
    }));
  };

  useEffect(() => {
    setMounted(true);

    async function loadStats() {
      try {
        const data = await fetchStatsDashboard();
        setStats(data);
      } catch (err) {
        console.error("Erro ao carregar estatísticas do dashboard:", err);
        setError("Não foi possível carregar os dados reais do Painel de Indicadores.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (!mounted || loading) {
    return <SkeletonLoader />;
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <AlertTriangle className="h-12 w-12 text-rose-500 animate-bounce" />
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          Erro ao Carregar Painel
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          {error ?? "Ocorreu um erro inesperado ao recuperar as métricas do banco de dados."}
        </p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Prepara dados dos gráficos
  const statusData = [
    { name: "Fase Interna", value: stats.metricas_projetos.por_status["Fase interna"] ?? 0 },
    { name: "Fase Externa", value: stats.metricas_projetos.por_status["Fase externa"] ?? 0 },
    { name: "Contratado", value: stats.metricas_projetos.por_status["Contratado"] ?? 0 },
  ];

  const priorityData = [
    { name: "Alta", value: stats.metricas_projetos.por_prioridade["alta"] ?? 0, fillOpacity: 1.0 },
    { name: "Média", value: stats.metricas_projetos.por_prioridade["media"] ?? 0, fillOpacity: 0.7 },
    { name: "Baixa", value: stats.metricas_projetos.por_prioridade["baixa"] ?? 0, fillOpacity: 0.4 },
  ];

  const complexityData = [
    { name: "Complexa", value: stats.metricas_projetos.por_complexidade["alta"] ?? 0, fillOpacity: 1.0 },
    { name: "Intermediária", value: stats.metricas_projetos.por_complexidade["media"] ?? 0, fillOpacity: 0.7 },
    { name: "Simples", value: stats.metricas_projetos.por_complexidade["baixa"] ?? 0, fillOpacity: 0.4 },
  ];

  const totalA_Vencer = stats.metricas_contratos.total_a_vencer;

  const sortedCargaEquipe = stats.carga_equipe
    ? [...stats.carga_equipe].sort((a, b) => b.pontuacao_total - a.pontuacao_total)
    : [];

  return (
    <div className="mx-auto max-w-[1440px] space-y-10 pb-12">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <BarChart3 size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Painel de Indicadores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Métricas de desempenho de PDTIC, PACC, Projetos e Contratos
          </p>
        </div>
      </div>

      {/* ── Planejamento Estratégico ────────────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary text-sm font-bold">1</span>
          Planejamento Estratégico
        </h2>

        {/* ── PDTIC ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">PDTIC</h3>
            {stats.metricas_pdtic.periodo_vigente && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                Período {stats.metricas_pdtic.periodo_vigente}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card: Ações PDTIC Planejadas */}
            <KpiCard
              title="Ações Planejadas"
              value={String(stats.metricas_pdtic.total_acoes_ativas)}
              subtitle="Ações ativas planejadas"
              icon={<FolderKanban size={20} />}
              accentColor="cyan"
            />

            {/* Card: Ações em Andamento */}
            <KpiCard
              title="Ações em Andamento"
              value={String(stats.metricas_pdtic.acoes_em_andamento)}
              subtitle={
                stats.metricas_pdtic.total_acoes_ativas > 0
                  ? `${Math.round((stats.metricas_pdtic.acoes_em_andamento / stats.metricas_pdtic.total_acoes_ativas) * 100)}% das ações ativas`
                  : "—"
              }
              icon={<Hourglass size={20} />}
              accentColor="orange"
            />

            {/* Card: Ações Contratadas */}
            <KpiCard
              title="Ações Contratadas"
              value={String(stats.metricas_pdtic.acoes_contratadas)}
              subtitle={
                stats.metricas_pdtic.total_acoes_ativas > 0
                  ? `${Math.round((stats.metricas_pdtic.acoes_contratadas / stats.metricas_pdtic.total_acoes_ativas) * 100)}% das ações ativas`
                  : "—"
              }
              icon={<CheckCircle2 size={20} />}
              accentColor="emerald"
            />

            {/* Card: Orçamento Estimado Total PDTIC */}
            <KpiCard
              title="Orçamento Estimado"
              value={formatCurrency(stats.metricas_pdtic.orcamento_total_estimado)}
              subtitle="Valor total estimado (Invest. + Custeio)"
              icon={<TrendingUp size={20} />}
              accentColor="indigo"
            />
          </div>
        </div>

        {/* ── PACC ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">PACC</h3>
            {stats.metricas_pacc.exercicio_vigente && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20">
                Exercício {stats.metricas_pacc.exercicio_vigente}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card: Itens Ativos no PACC */}
            <KpiCard
              title="Itens Planejados"
              value={String(stats.metricas_pacc.total_itens_ativos)}
              subtitle="Itens ativos no PACC"
              icon={<FolderKanban size={20} />}
              accentColor="cyan"
            />

            {/* Card: Itens em Andamento */}
            <KpiCard
              title="Itens em Andamento"
              value={String(stats.metricas_pacc.itens_em_andamento)}
              subtitle={
                stats.metricas_pacc.total_itens_ativos > 0
                  ? `${Math.round((stats.metricas_pacc.itens_em_andamento / stats.metricas_pacc.total_itens_ativos) * 100)}% dos itens ativos`
                  : "—"
              }
              icon={<Hourglass size={20} />}
              accentColor="orange"
            />

            {/* Card: Itens Contratados */}
            <KpiCard
              title="Itens Contratados"
              value={String(stats.metricas_pacc.itens_contratados)}
              subtitle={
                stats.metricas_pacc.total_itens_ativos > 0
                  ? `${Math.round((stats.metricas_pacc.itens_contratados / stats.metricas_pacc.total_itens_ativos) * 100)}% dos itens ativos`
                  : "—"
              }
              icon={<CheckCircle2 size={20} />}
              accentColor="emerald"
            />

            {/* Card: Valor Estimado Total PACC */}
            <KpiCard
              title="Orçamento Estimado"
              value={formatCurrency(stats.metricas_pacc.valor_total_estimado)}
              subtitle="Valor total estimado do PACC"
              icon={<TrendingUp size={20} />}
              accentColor="indigo"
            />
          </div>
        </div>
      </div>

      {/* Divisor sutil */}
      <hr className="border-t border-border/40 my-10" />

      {/* ── Projetos ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary text-sm font-bold">2</span>
          Projetos
        </h2>

        {/* Gráficos Bento Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gráfico 1 - Distribuição de Projetos por Status */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Distribuição por Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contagem de projetos em cada etapa da esteira de contratação
              </p>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.05)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {payload[0].payload.name}
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                              {payload[0].value} {payload[0].value === 1 ? "Projeto" : "Projetos"}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--brand-primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2 - Distribuição de Prioridades */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Prioridade dos Projetos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Divisão de carga por nível de prioridade cadastrada
              </p>
            </div>

            <div className="flex h-[320px] flex-col justify-between">
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Prioridade {payload[0].name}
                              </p>
                              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                                {payload[0].value} {payload[0].value === 1 ? "Projeto" : "Projetos"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill="var(--brand-primary)"
                          fillOpacity={entry.fillOpacity}
                          stroke="var(--background-card)"
                          strokeWidth={2}
                          style={{ outline: 'none' }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="flex justify-around border-t border-slate-100 pt-4 dark:border-slate-800">
                {priorityData.map((item) => (
                  <div key={item.name} className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: "var(--brand-primary)",
                          opacity: item.fillOpacity,
                        }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfico 3 - Distribuição de Complexidade */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Complexidade dos Projetos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Divisão de carga por nível de complexidade
              </p>
            </div>

            <div className="flex h-[320px] flex-col justify-between">
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Complexidade {payload[0].name}
                              </p>
                              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                                {payload[0].value} {payload[0].value === 1 ? "Projeto" : "Projetos"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={complexityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {complexityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill="var(--brand-primary)"
                          fillOpacity={entry.fillOpacity}
                          stroke="var(--background-card)"
                          strokeWidth={2}
                          style={{ outline: 'none' }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="flex justify-around border-t border-slate-100 pt-4 dark:border-slate-800">
                {complexityData.map((item) => (
                  <div key={item.name} className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: "var(--brand-primary)",
                          opacity: item.fillOpacity,
                        }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Eficiência da Esteira de Contratação */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-brand-primary" />
              Eficiência da Esteira de Contratação
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tempo médio de tramitação dos projetos em cada fase do ciclo
            </p>
          </div>

          <div className="space-y-6">
            {/* Fase Interna */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Fase Interna (Planejamento)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {stats.tempo_medio?.fase_interna ?? 0} dias em média
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((stats.tempo_medio?.fase_interna ?? 0) / 180) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Do cadastro inicial até o envio para a licitação externa
              </p>
            </div>

            {/* Fase Externa */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Fase Externa (Licitação)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {stats.tempo_medio?.fase_externa ?? 0} dias em média
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-primary/80 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((stats.tempo_medio?.fase_externa ?? 0) / 180) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Do envio à licitação até a assinatura definitiva do contrato
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divisor sutil */}
      <hr className="border-t border-border/40 my-10" />

      {/* ── Gestão Contratual ───────────────────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary text-sm font-bold">3</span>
          Gestão Contratual
        </h2>

        {/* Cards de KPI Financeiro */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Contratos Vigentes */}
          <KpiCard
            title="Contratos Vigentes"
            value={`${stats.metricas_contratos.total_vigentes} / ${stats.metricas_contratos.total_contratos}`}
            subtitle="Contratos ativos do órgão"
            icon={<CheckCircle2 size={20} />}
            accentColor="emerald"
          />

          {/* Card: Total Investido */}
          <KpiCard
            title="Total Investido"
            value={formatCurrency(stats.metricas_contratos.valor_total_investido)}
            subtitle="Soma do valor de contratos de TI"
            icon={<TrendingUp size={20} />}
            accentColor="indigo"
          />

          {/* Card: Contratos Críticos a Vencer */}
          <KpiCard
            title="Contratos Críticos a Vencer"
            value={String(totalA_Vencer)}
            subtitle="Críticos (< 180 dias)"
            icon={<AlertTriangle size={20} />}
            accentColor={totalA_Vencer > 0 ? "rose" : "emerald"}
            pulse={totalA_Vencer > 0}
            warning={totalA_Vencer > 0}
          />
        </div>

        {/* Alocação de Gestores e Fiscais */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Alocação de Gestores e Fiscais
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Carga de trabalho ativa e complexidade dos contratos atribuídos
            </p>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {sortedCargaEquipe.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600">
                <p className="text-xs font-semibold">Nenhum servidor alocado atualmente</p>
              </div>
            ) : (
              sortedCargaEquipe.map((servidor) => {
                // Get initials
                const initials = servidor.nome_completo
                  .split(" ")
                  .filter((n) => n && n.length > 2)
                  .map((n) => n[0].toUpperCase())
                  .slice(0, 2)
                  .join("");

                const isExpanded = !!expandedServers[servidor.nome_completo];

                return (
                  <div
                    key={servidor.nome_completo}
                    className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/40 dark:bg-slate-950/20"
                  >
                    {/* Header (clickable part) */}
                    <div
                      onClick={() => toggleServerExpand(servidor.nome_completo)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/40 rounded-t-md transition-colors select-none"
                    >
                      {/* Left & Center */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary dark:bg-brand-primary/20">
                          {initials || "SV"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {servidor.nome_completo}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                            <span>
                              {servidor.total_contratos} {servidor.total_contratos === 1 ? "contrato" : "contratos"} sob gestão
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center rounded-full bg-brand-primary/5 px-1.5 py-0.2 text-[9px] font-bold text-brand-primary dark:bg-brand-primary/10">
                              {servidor.pontuacao_total} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Badges + Chevron */}
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        {/* Badges of Complexity */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {servidor.complexidade.alta > 0 && (
                            <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500 dark:text-red-400 border border-red-500/20">
                              {servidor.complexidade.alta} Complexa
                            </span>
                          )}
                          {servidor.complexidade.media > 0 && (
                            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {servidor.complexidade.media} Intermediária
                            </span>
                          )}
                          {servidor.complexidade.baixa > 0 && (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {servidor.complexidade.baixa} Simples
                            </span>
                          )}
                        </div>

                        {/* Chevron Icon with Rotation */}
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 dark:text-slate-600 transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-white/30 p-3 dark:border-slate-800/30 dark:bg-black/10 rounded-b-md animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                          Contratos Vinculados
                        </p>
                        {!servidor.nomes_contratos || servidor.nomes_contratos.length === 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-500 italic">
                            Nenhum contrato ativo vinculado.
                          </p>
                        ) : (
                          <ul className="space-y-1.5 pl-1">
                            {servidor.nomes_contratos.map((nome, cIdx) => (
                              <li
                                key={cIdx}
                                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                              >
                                <span className="text-brand-primary font-bold mt-0.5">•</span>
                                <span className="flex-1 font-medium">{nome}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card Component ────────────────────────────────────────────────── */
function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  pulse,
  warning,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  pulse?: boolean;
  warning?: boolean;
}) {
  const accent = ACCENT_MAP[accentColor] ?? ACCENT_MAP.indigo;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-900 ${
        warning
          ? "border-rose-300 bg-rose-50/20 dark:border-rose-800/40 dark:bg-rose-950/10 shadow-rose-100 dark:shadow-none"
          : accent.border
      }`}
    >
      {/* Decorative glow */}
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${
          warning ? "bg-rose-100 dark:bg-rose-900/10" : accent.bg
        } opacity-70 transition-transform duration-500 group-hover:scale-150`}
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p
            className={`mt-2 text-2xl font-extrabold tabular-nums ${
              warning ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
            warning ? "from-rose-500 to-red-600" : accent.gradient
          } text-white shadow-lg ${warning ? "shadow-rose-500/25" : accent.glow}`}
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

/* ── Skeleton Loader Component ─────────────────────────────────────────── */
function SkeletonLoader() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-10 pb-12">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
          <div className="h-3.5 w-64 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
        </div>
      </div>

      {/* 1. Planejamento Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-[108px] rounded-xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex justify-between">
                <div className="space-y-3 w-2/3">
                  <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
                  <div className="h-6 w-24 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
                  <div className="h-2 w-32 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
                </div>
                <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-t border-border/40 my-10" />

      {/* 2. Projeto Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-32 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 h-[410px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="space-y-2">
              <div className="h-4.5 w-48 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
              <div className="h-3 w-64 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
            </div>
            <div className="h-[300px] w-full rounded-lg bg-slate-100 animate-pulse dark:bg-slate-800" />
          </div>
          <div className="lg:col-span-2 h-[410px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="space-y-2">
              <div className="h-4.5 w-48 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
              <div className="h-3 w-64 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
            </div>
            <div className="h-[300px] w-full rounded-lg bg-slate-100 animate-pulse dark:bg-slate-800" />
          </div>
        </div>
        {/* Conveyor Efficiency Skeleton */}
        <div className="h-[200px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
          <div className="space-y-3">
            <div className="h-3 w-full rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
            <div className="h-3 w-full rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
          </div>
        </div>
      </div>

      <hr className="border-t border-border/40 my-10" />

      {/* 3. Gestão Contratual Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-48 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-[108px] rounded-xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex justify-between">
                <div className="space-y-3 w-2/3">
                  <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
                  <div className="h-6 w-24 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
                  <div className="h-2 w-32 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
                </div>
                <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
        {/* Managers Workload Skeleton */}
        <div className="h-[300px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="h-4.5 w-48 rounded bg-slate-200 animate-pulse dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-12 w-full rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
            <div className="h-12 w-full rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
            <div className="h-12 w-full rounded bg-slate-100 animate-pulse dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
