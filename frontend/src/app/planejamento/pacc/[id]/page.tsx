"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  History, 
  FileText,
  DollarSign,
  Link2,
  Hash,
  Building2
} from "lucide-react";
import { obterItemPacc } from "@/lib/api";
import type { PaccItemComHistoricoResponse } from "@/types/pacc";
import { STATUS_ACAO_COLOR, TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";
import type { StatusAcao, TipoNecessidade } from "@/types/pdtic";
import { formatCurrency } from "@/lib/formatters";

export default function PaccItemDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const itemId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [item, setItem] = useState<PaccItemComHistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "vinculo-pdtic" | "historico">("visao-geral");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await obterItemPacc(itemId);
        setItem(data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar detalhes do Item PACC.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [itemId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle size={32} />
        <p className="text-sm font-medium">{error || "Item não encontrado."}</p>
        <Link
          href="/planejamento/pacc"
          className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const isExcluido = item.revisao_exclusao_id !== null;
  const acaoPdtic = item.acao_pdtic;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      
      {/* ── Breadcrumb & Top Actions ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/planejamento/pacc"
          className="flex items-center gap-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Voltar para PACC
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/planejamento/pacc/${item.id}/editar`}
            className="rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-background-secondary"
          >
            Editar Item
          </Link>
        </div>
      </div>

      {/* ── Header Principal ── */}
      <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${isExcluido ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"}`}>
                Item {item.numero_item}
              </span>
              {isExcluido && (
                <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  Excluído
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
              {item.descricao_demanda}
            </h1>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Hash size={16} />
                ID: {item.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navegação de Abas ── */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-px">
        <button
          onClick={() => setActiveTab("visao-geral")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "visao-geral"
              ? "border-teal-500 text-teal-600 dark:border-teal-400 dark:text-teal-300"
              : "border-transparent text-foreground-muted hover:border-border hover:text-foreground"
          }`}
        >
          <FileText size={16} /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("vinculo-pdtic")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "vinculo-pdtic"
              ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300"
              : "border-transparent text-foreground-muted hover:border-border hover:text-foreground"
          }`}
        >
          <Link2 size={16} /> Ação PDTIC Vinculada
        </button>
        <button
          onClick={() => setActiveTab("historico")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "historico"
              ? "border-teal-500 text-teal-600 dark:border-teal-400 dark:text-teal-300"
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
                <h2 className="text-sm font-bold uppercase tracking-wider text-teal-700 dark:text-teal-500">
                  Dados Básicos da Demanda
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Descrição Detalhada</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {item.descricao_demanda}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Quantidade</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center font-mono">
                    {item.quantidade || "—"}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-500" />
                    Valor Estimado
                  </label>
                  <div className="w-full rounded-lg border border-slate-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400 min-h-[42px] flex items-center">
                    {formatCurrency(item.valor_estimado)}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Processo(s) SEI Vinculado(s)</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex flex-col justify-center font-mono">
                    {item.processo_sei ? (
                      item.processo_sei.split("\n").map((sei, idx) => (
                        <span key={idx} className="whitespace-nowrap">{sei}</span>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* ═══ ABA: VÍNCULO PDTIC ═══ */}
        {activeTab === "vinculo-pdtic" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                <Link2 size={16} /> Ação Planejada no PDTIC
              </div>
              <Link
                href={`/planejamento/pdtic/${item.acao_pdtic_id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
              >
                Abrir Ação Completa <ArrowLeft size={14} className="rotate-135 transform scale-x-[-1]" />
              </Link>
            </div>

            {acaoPdtic ? (
              <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/50">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-md bg-indigo-100 px-3 py-1 text-sm font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                        {acaoPdtic.codigo_acao}
                      </span>
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_ACAO_COLOR[acaoPdtic.status as StatusAcao] || "bg-slate-100 text-slate-700"}`}>
                        {acaoPdtic.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {acaoPdtic.descricao}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Necessidade
                    </label>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {acaoPdtic.necessidade}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tipo de Necessidade
                    </label>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {acaoPdtic.tipo_necessidade?.map((t) => TIPO_NECESSIDADE_LABEL[t as TipoNecessidade]).join(", ")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Unidade Demandante
                    </label>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      {acaoPdtic.unidade_demandante}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background-secondary/50 p-8 text-center text-sm text-foreground-muted">
                Nenhuma Ação PDTIC vinculada ou a ação foi excluída.
              </div>
            )}
          </div>
        )}

        {/* ═══ ABA: HISTÓRICO ═══ */}
        {activeTab === "historico" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted">
              <History size={16} className="text-blue-500" /> Auditoria de Revisões PACC
            </div>

            <div className="relative border-l-2 border-teal-200 dark:border-teal-900 ml-3 space-y-8 py-2">
              {/* Inclusão */}
              <div className="relative pl-6">
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-teal-500 dark:border-slate-900" />
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Adicionado no PACC</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Revisão: <span className="font-semibold">{item.revisao_inclusao?.descricao || (item.revisao_inclusao?.numero_revisao === 0 ? "Aprovação Inicial" : "Revisão " + item.revisao_inclusao_id)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Data: {new Date(item.criado_em).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {/* Exclusão */}
              {isExcluido && item.revisao_exclusao && (
                <div className="relative pl-6">
                  <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-red-500 dark:border-slate-900" />
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Excluído / Substituído</div>
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Revisão: <span className="font-semibold">{item.revisao_exclusao.descricao || "Revisão " + item.revisao_exclusao_id}</span>
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
