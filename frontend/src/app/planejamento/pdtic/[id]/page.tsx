"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  BarChart3, 
  History, 
  FileText,
  DollarSign
} from "lucide-react";
import { obterAcaoPdtic } from "@/lib/api";
import type { PdticAcaoComHistoricoResponse } from "@/types/pdtic";
import { TIPO_NECESSIDADE_LABEL, STATUS_ACAO_COLOR } from "@/types/pdtic";
import { formatMonthYear } from "@/lib/formatters";

export default function PdticAcaoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const acaoId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [acao, setAcao] = useState<PdticAcaoComHistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "valores" | "historico">("visao-geral");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await obterAcaoPdtic(acaoId);
        setAcao(data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar detalhes da Ação PDTIC.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [acaoId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !acao) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle size={32} />
        <p className="text-sm font-medium">{error || "Ação não encontrada."}</p>
        <Link
          href="/planejamento/pdtic"
          className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const isExcluida = acao.revisao_exclusao_id !== null;

  const totalInv = acao.valores_investimento ? Object.values(acao.valores_investimento).reduce((a, b) => a + b, 0) : 0;
  const totalCus = acao.valores_custeio ? Object.values(acao.valores_custeio).reduce((a, b) => a + b, 0) : 0;
  const totalGeral = totalInv + totalCus;

  // Extract years from the investment and custeio keys to dynamically show columns
  const allYears = new Set<string>();
  if (acao.valores_investimento) Object.keys(acao.valores_investimento).forEach(y => allYears.add(y));
  if (acao.valores_custeio) Object.keys(acao.valores_custeio).forEach(y => allYears.add(y));
  const anosRange = Array.from(allYears).sort();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      
      {/* ── Breadcrumb & Top Actions ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/planejamento/pdtic"
          className="flex items-center gap-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Voltar para PDTIC
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/planejamento/pdtic/${acao.id}/editar`}
            className="rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-background-secondary"
          >
            Editar Ação
          </Link>
        </div>
      </div>

      {/* ── Header Principal ── */}
      <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${isExcluida ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" : "bg-brand-primary/10 text-brand-primary"}`}>
                {acao.codigo_acao}
              </span>
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_ACAO_COLOR[acao.status] || "bg-slate-100 text-slate-700"}`}>
                {acao.status}
              </span>
              {isExcluida && (
                <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  Excluída
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
              {acao.descricao}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Navegação de Abas ── */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-px">
        <button
          onClick={() => setActiveTab("visao-geral")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "visao-geral"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-foreground-muted hover:border-border hover:text-foreground"
          }`}
        >
          <FileText size={16} /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("valores")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "valores"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-foreground-muted hover:border-border hover:text-foreground"
          }`}
        >
          <DollarSign size={16} /> Valores Estimados
        </button>
        <button
          onClick={() => setActiveTab("historico")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "historico"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-foreground-muted hover:border-border hover:text-foreground"
          }`}
        >
          <History size={16} /> Histórico
        </button>
      </div>

      {/* ── Conteúdo da Aba ── */}
      <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm">

        {/* ═══ ABA: VISÃO GERAL ═══ */}
        {activeTab === "visao-geral" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <section>
              <div className="mb-6 border-b border-border pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                  Dados da Ação
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Necessidade</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center font-mono">
                    {acao.necessidade}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Tipo de Necessidade</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {acao.tipo_necessidade?.map((t) => TIPO_NECESSIDADE_LABEL[t as keyof typeof TIPO_NECESSIDADE_LABEL]).join(", ")}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Quantidade</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {acao.quantidade || "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Total GUT</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {acao.total_gut}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Previsão de Contratação</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center font-mono">
                    {formatMonthYear(acao.previsao_contratacao)}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Previsão de Renovação</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center font-mono">
                    {formatMonthYear(acao.previsao_renovacao)}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-6 border-b border-border pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                  Detalhamento Organizacional
                </h2>
              </div>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Departamentos</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex flex-wrap items-center gap-2">
                    {acao.departamentos_rel && acao.departamentos_rel.length > 0
                      ? acao.departamentos_rel.map(d => (
                          <span key={d.id} className="inline-flex items-center bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-500/50 dark:text-emerald-300">
                            {d.sigla ? `${d.sigla} - ${d.nome}` : d.nome}
                          </span>
                        ))
                      : "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Unidades Demandantes</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex flex-wrap items-center gap-2">
                    {acao.unidades_demandantes_rel && acao.unidades_demandantes_rel.length > 0
                      ? acao.unidades_demandantes_rel.map(d => (
                          <span key={d.id} className="inline-flex items-center bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-300">
                            {d.sigla ? `${d.sigla} - ${d.nome}` : d.nome}
                          </span>
                        ))
                      : "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Unidades Responsáveis</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex flex-wrap items-center gap-2">
                    {acao.unidades_responsaveis_rel && acao.unidades_responsaveis_rel.length > 0
                      ? acao.unidades_responsaveis_rel.map(d => (
                          <span key={d.id} className="inline-flex items-center bg-violet-50 text-violet-700 text-xs px-2.5 py-1 rounded-full border border-violet-100 dark:bg-violet-900/30 dark:border-violet-500/50 dark:text-violet-300">
                            {d.sigla ? `${d.sigla} - ${d.nome}` : d.nome}
                          </span>
                        ))
                      : "—"}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-6 border-b border-border pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                  Desempenho
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Meta</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {acao.meta || "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Indicador</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {acao.indicador || "—"}
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* ═══ ABA: VALORES ═══ */}
        {activeTab === "valores" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted mb-4">
              <BarChart3 size={16} className="text-emerald-500" /> Resumo Financeiro
            </div>

            {anosRange.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background-secondary/50 p-8 text-center text-sm text-foreground-muted">
                Nenhum valor estimado cadastrado para esta ação.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Investimento */}
                {totalInv > 0 && (
                  <div className="rounded-xl border border-slate-200 shadow-sm bg-white dark:bg-slate-900/50 dark:border-slate-800 p-6">
                    <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Investimento (Capital)
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {totalInv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {anosRange.map((ano) => (
                        <div key={ano} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border border-slate-100 dark:border-slate-700/50">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{ano}</div>
                          <div className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {(acao.valores_investimento?.[ano] ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custeio */}
                {totalCus > 0 && (
                  <div className="rounded-xl border border-slate-200 shadow-sm bg-white dark:bg-slate-900/50 dark:border-slate-800 p-6">
                    <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Custeio
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {totalCus.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {anosRange.map((ano) => (
                        <div key={ano} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border border-slate-100 dark:border-slate-700/50">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{ano}</div>
                          <div className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {(acao.valores_custeio?.[ano] ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Geral */}
                <div className="flex items-center justify-between rounded-xl bg-brand-primary/5 border border-brand-primary/10 p-6">
                  <span className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                    Orçamento Total Estimado
                  </span>
                  <span className="text-xl font-extrabold text-brand-primary">
                    {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ABA: HISTÓRICO ═══ */}
        {activeTab === "historico" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted">
              <History size={16} className="text-blue-500" /> Auditoria de Revisões
            </div>

            <div className="relative border-l-2 border-brand-primary/20 ml-3 space-y-8 py-2">
              {/* Inclusão */}
              <div className="relative pl-6">
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-brand-primary dark:border-slate-900" />
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Adicionada no PDTIC</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Revisão: <span className="font-semibold">{acao.revisao_inclusao?.descricao || (acao.revisao_inclusao?.numero_revisao === 0 ? "Aprovação Inicial" : "Revisão " + acao.revisao_inclusao_id)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Data: {new Date(acao.criado_em).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {/* Exclusão */}
              {isExcluida && acao.revisao_exclusao && (
                <div className="relative pl-6">
                  <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-red-500 dark:border-slate-900" />
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Excluída / Substituída</div>
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Revisão: <span className="font-semibold">{acao.revisao_exclusao.descricao || "Revisão " + acao.revisao_exclusao_id}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
