"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  Shield,
  Users,
  Layers,
  Loader2,
  BarChart3,
  CheckCircle2,
  Clock,
  Inbox,
  Send,
  PackageCheck,
  Trophy,
  Save,
  CalendarClock,
  Play,
  Check,
  AlertTriangle,
  Folder,
  Lock,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { differenceInDays, parseISO, isValid, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArtefatoCard } from "@/components/projetos/ArtefatoCard";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import {
  fetchPainelProjeto,
  enviarParaLicitacao,
  atualizarTramiteLicitacao,
  concluirLicitacao,
  fetchHistoricoProjeto,
  fetchObservacoesFaseExterna,
  addObservacaoFaseExterna,
  adicionarObservacaoProjeto,
  type HistoricoEvento,
  type ObservacaoFaseExterna,
} from "@/lib/api";
import type {
  ProjetoPainelResponse,
  ProjetoComDetalhes,
} from "@/types/projeto";
import {
  COMPLEXIDADE_CONFIG,
  STATUS_PROJETO_CONFIG,
} from "@/types/projeto";

/* ── Helper de formatação de data ──────────────────────────────────────── */

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const parsed = parseISO(d);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  const parsed = parseISO(d);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";
}

/* ── Página ────────────────────────────────────────────────────────────── */

export default function ProjetoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projetoId = Number(id);

  const [data, setData] = useState<ProjetoPainelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "artefatos" | "equipe" | "fase-externa" | "informacoes-complementares" | "historico">("visao-geral");
  const [eventos, setEventos] = useState<HistoricoEvento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);

  const [obsTexto, setObsTexto] = useState("");
  const [sendingObs, setSendingObs] = useState(false);

  const handleEnviarObservacao = async () => {
    if (!obsTexto.trim()) return;
    setSendingObs(true);
    try {
      let username: string | undefined;
      const userCookie = Cookies.get("itertic_user");
      if (userCookie) {
        try {
          const userObj = JSON.parse(userCookie);
          username = userObj.nome || userObj.matricula || undefined;
        } catch {
          username = userCookie;
        }
      }
      await adicionarObservacaoProjeto(projetoId, obsTexto.trim(), username);
      setObsTexto("");
      refresh();
    } catch {
      showToast("error", "Erro ao salvar observação.");
    } finally {
      setSendingObs(false);
    }
  };


  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const painel = await fetchPainelProjeto(projetoId);
        setData(painel);
      } catch {
        console.error("Erro ao carregar dados do projeto.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projetoId, fetchKey]);

  useEffect(() => {
    if (activeTab === "historico") {
      setLoadingEventos(true);
      fetchHistoricoProjeto(projetoId)
        .then(setEventos)
        .catch(() => showToast("error", "Erro ao carregar histórico."))
        .finally(() => setLoadingEventos(false));
    }
  }, [activeTab, projetoId, fetchKey]);

  const refresh = () => setFetchKey((k) => k + 1);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <Inbox size={40} className="text-foreground-muted mb-3" />
        <h2 className="text-lg font-bold text-foreground">Projeto não encontrado</h2>
        <Link href="/projetos" className="mt-3 text-sm text-brand-primary hover:underline">
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const projeto = data.projeto;
  const complexidade = projeto.complexidade ? COMPLEXIDADE_CONFIG[projeto.complexidade] : null;
  const statusCfg = STATUS_PROJETO_CONFIG[projeto.status];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back + Header */}
      <div>
        <Link
          href="/projetos"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar à lista de projetos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <FolderKanban size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {projeto.nome}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                <FileText size={11} />
                <span className="font-mono">{projeto.processo_sei}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusCfg.cls}`}
            >
              {statusCfg.icon} {projeto.status}
            </span>
            {projeto.is_legado && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                📋 Anterior
              </span>
            )}
          </div>
        </div>
      </div>



      {/* ── Navegação em Abas ── */}
      <div className="flex overflow-x-auto border-b border-border mb-6 no-scrollbar">
        {([
          { key: "visao-geral" as const, label: "Visão Geral" },
          { key: "artefatos" as const, label: "Artefatos" },
          { key: "equipe" as const, label: "Equipe" },
          { key: "fase-externa" as const, label: "Fase Externa" },
          { key: "informacoes-complementares" as const, label: "Informações Complementares" },
          { key: "historico" as const, label: "Histórico" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo da Aba ── */}
      <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm">

        {/* ═══ ABA: VISÃO GERAL ═══ */}
        {activeTab === "visao-geral" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Seção 1: DADOS BÁSICOS */}
            <section>
              <div className="mb-6 border-b border-border pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                  Dados Básicos
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Linha 1 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Nome do Projeto</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center">
                    {projeto.nome}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Processo SEI</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center font-mono">
                    {projeto.processo_sei || "—"}
                  </div>
                </div>

                {/* Linha 2 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Prioridade</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center capitalize">
                    {projeto.prioridade ? projeto.prioridade : <span className="text-slate-400 italic">Não se aplica</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Complexidade</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[42px] flex items-center capitalize">
                    {projeto.complexidade ? projeto.complexidade : <span className="text-slate-400 italic">Não se aplica</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 2: PLANEJAMENTO ESTRATÉGICO */}
            <section className="mt-10">
              <div className="mb-6 border-b border-border pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                  Planejamento Estratégico
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Ações PDTIC</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[100px]">
                    {projeto.acoes_pdtic.length > 0 ? (
                      <ul className="space-y-2 list-inside list-disc marker:text-slate-400">
                        {projeto.acoes_pdtic.map((a) => (
                          <li key={a.id}>
                            <span className="font-semibold">{a.codigo_acao}</span> — {a.descricao}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">Nenhum vínculo selecionado.</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Itens PACC</label>
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 min-h-[100px]">
                    {projeto.itens_pacc.length > 0 ? (
                      <ul className="space-y-2 list-inside list-disc marker:text-slate-400">
                        {projeto.itens_pacc.map((i) => (
                          <li key={i.id}>
                            <span className="font-semibold">#{i.numero_item}</span> — {i.descricao_demanda}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">Nenhum vínculo selecionado.</span>
                    )}
                  </div>
                </div>
              </div>
            </section>



          </div>
        )}

        {/* ═══ ABA: ARTEFATOS (TABELA DE AUDITORIA READ-ONLY) ═══ */}
        {activeTab === "artefatos" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {projeto.is_legado ? (
              <div className="rounded-2xl border border-dashed border-amber-200 dark:border-amber-800 px-6 py-10 flex flex-col items-center gap-3 text-center">
                <span className="text-3xl">📦</span>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Projeto Anterior — Sem Esteira de Artefatos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">Projetos anteriores representam contratações passadas e não possuem os artefatos da fase interna registrados no sistema.</p>
              </div>
            ) : projeto.artefatos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 flex flex-col items-center gap-3 text-center">
                <Inbox size={32} className="text-foreground-muted/30" />
                <p className="text-sm font-medium text-foreground-muted">Nenhum artefato inicializado.</p>
              </div>
            ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-background-card">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="w-[22%] px-4 py-3 whitespace-nowrap">Artefato</th>
                    <th className="w-[12%] px-4 py-3 whitespace-nowrap">Data Início</th>
                    <th className="w-[12%] px-4 py-3 whitespace-nowrap">Prazo Limite</th>
                    <th className="w-[12%] px-4 py-3 whitespace-nowrap">Data Conclusão</th>
                    <th className="w-[10%] px-4 py-3 whitespace-nowrap">Duração</th>
                    <th className="w-[32%] px-4 py-3">Justificativa Atraso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {projeto.artefatos.sort((a, b) => a.id - b.id).map((art) => {
                    let dias = "—";
                    let isLate = false;
                    let isDone = art.status === "Concluído";
                    
                    if (art.data_inicio && art.data_fim_prevista) {
                      const dIni = parseISO(art.data_inicio);
                      const dFim = parseISO(art.data_fim_prevista);
                      const dConc = art.data_conclusao ? parseISO(art.data_conclusao) : new Date();
                      
                      if (isValid(dIni) && isValid(dFim) && isValid(dConc)) {
                        const diff = differenceInDays(dConc, dIni);
                        dias = diff >= 0 ? `${diff} dias` : "—";
                        if (isDone && dConc > dFim) isLate = true;
                        if (!isDone && dConc > dFim) isLate = true;
                      }
                    }

                    return (
                      <tr key={art.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-bold text-brand-primary whitespace-nowrap">{art.tipo}</td>
                        <td className="px-4 py-3">{fmtDate(art.data_inicio)}</td>
                        <td className="px-4 py-3">
                          {art.data_fim_prevista ? (
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold w-fit ${isLate ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                              {fmtDate(art.data_fim_prevista)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">{fmtDate(art.data_conclusao)}</td>
                        <td className="px-4 py-3">
                          {dias !== "—" ? (
                            <span className={`font-semibold ${isLate ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {dias}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs break-words">
                          {art.justificativa_atraso || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ═══ ABA: EQUIPE ═══ */}
        {activeTab === "equipe" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {projeto.is_legado ? (
              <div className="rounded-2xl border border-dashed border-amber-200 dark:border-amber-800 px-6 py-10 flex flex-col items-center gap-3 text-center">
                <span className="text-3xl">📦</span>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Projeto Anterior — Equipe Não Aplicável</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">Projetos anteriores representam contratações passadas e não possuem equipe de planejamento cadastrada no sistema.</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                  <Users size={16} className="text-brand-primary" /> Equipe de Planejamento
                </div>
                <div className="grid grid-cols-1 gap-5">
                  {([
                    {
                      label: "Integrante Requisitante",
                      titulares: projeto.integrantes_requisitantes || [],
                      substitutos: projeto.substitutos_requisitantes || [],
                    },
                    {
                      label: "Integrante Técnico",
                      titulares: projeto.integrantes_tecnicos || [],
                      substitutos: projeto.substitutos_tecnicos || [],
                    },
                    {
                      label: "Integrante Administrativo",
                      titulares: projeto.integrantes_administrativos || [],
                      substitutos: projeto.substitutos_administrativos || [],
                    },
                  ] as const).map(({ label, titulares, substitutos }) => (
                    <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 bg-slate-50/30 dark:bg-slate-900/20">
                      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-primary">{label}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Titulares */}
                        <div>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Titular(es)</div>
                          {titulares.length > 0 ? (
                            <div className="grid gap-2">
                              {titulares.map(pessoa => (
                                <div key={pessoa.id} className="rounded-lg border border-border bg-background-secondary px-3 py-2 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground truncate">{pessoa.nome}</div>
                                    <div className="mt-0.5 flex items-center gap-3 text-xs text-foreground-muted">
                                      <span className="truncate">{pessoa.cargo}</span>
                                      <span className="font-mono text-[11px]">Mat. {pessoa.matricula}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-foreground-muted italic">Nenhum titular designado</div>
                          )}
                        </div>
                        {/* Substitutos */}
                        <div>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Substituto(s)</div>
                          {substitutos.length > 0 ? (
                            <div className="grid gap-2">
                              {substitutos.map(pessoa => (
                                <div key={pessoa.id} className="rounded-lg border border-border bg-background-secondary px-3 py-2 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground truncate">{pessoa.nome}</div>
                                    <div className="mt-0.5 flex items-center gap-3 text-xs text-foreground-muted">
                                      <span className="truncate">{pessoa.cargo}</span>
                                      <span className="font-mono text-[11px]">Mat. {pessoa.matricula}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-foreground-muted italic">Nenhum substituto designado</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ ABA: FASE EXTERNA ═══ */}
        {activeTab === "fase-externa" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <FaseExternaSection projeto={projeto} onRefresh={refresh} />
          </div>
        )}

        {/* ═══ ABA: INFORMAÇÕES COMPLEMENTARES ═══ */}
        {activeTab === "informacoes-complementares" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">



            {/* Form to submit new observation */}
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={obsTexto}
                  onChange={(e) => setObsTexto(e.target.value)}
                  placeholder="Adicione uma observação sobre o projeto..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 resize-none focus:border-brand-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/20 shadow-sm transition-all"
                />
              </div>
              <button
                onClick={handleEnviarObservacao}
                disabled={!obsTexto.trim() || sendingObs}
                className="flex h-[46px] items-center gap-2 self-start rounded-xl bg-brand-primary px-5 text-sm font-bold text-white shadow-md shadow-brand-primary/20 transition-all hover:shadow-lg hover:bg-brand-primary-hover active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {sendingObs ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Registrar
              </button>
            </div>

            {/* Historical observations of type "Observação Manual" */}
            {projeto.historico && projeto.historico.filter(h => h.tipo_registro === "Observação Manual").length > 0 && (
              <div className="space-y-4 border-t border-border pt-6">
                <div className="space-y-4">
                  {projeto.historico
                    .filter(h => h.tipo_registro === "Observação Manual")
                    .map((obs) => {
                      const autorNome = (() => {
                        if (!obs.autor) return "Usuário do Sistema";
                        if (obs.autor.startsWith("{")) {
                          try {
                            const parsed = JSON.parse(obs.autor);
                            return parsed.nome || parsed.matricula || obs.autor;
                          } catch {
                            return obs.autor;
                          }
                        }
                        return obs.autor;
                      })();
                      const inicial = autorNome.charAt(0).toUpperCase();

                      return (
                        <div key={obs.id} className="flex gap-4 p-4 rounded-xl hover:bg-slate-500/5 transition-colors border border-border/40 bg-background-secondary/30">
                          {/* Avatar Badge */}
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/10 font-bold text-sm text-brand-primary shadow-inner">
                            {inicial}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {autorNome}
                              </span>
                              <span className="text-[11px] text-foreground-muted">
                                {formatDateTime(obs.data_hora)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground-muted whitespace-pre-wrap leading-relaxed">
                              {obs.conteudo}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ABA: HISTÓRICO ═══ */}
        {activeTab === "historico" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <Clock size={16} className="text-brand-primary" /> Linha do Tempo
            </div>
            {loadingEventos ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 size={24} className="animate-spin text-brand-primary" />
              </div>
            ) : eventos.length > 0 ? (
              <div className="relative space-y-0 pl-7 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {eventos.map((evt) => {
                  let Icon = Clock;
                  let colorClass = "text-brand-primary";
                  let bgClass = "bg-brand-primary/10";
                  let borderClass = "border-brand-primary/20";
                  
                  if (evt.icone === "folder") { Icon = Folder; }
                  else if (evt.icone === "play") { Icon = Play; colorClass = "text-blue-500"; bgClass = "bg-blue-50 dark:bg-blue-900/20"; borderClass = "border-blue-200 dark:border-blue-800"; }
                  else if (evt.icone === "check") { Icon = Check; colorClass = "text-emerald-500"; bgClass = "bg-emerald-50 dark:bg-emerald-900/20"; borderClass = "border-emerald-200 dark:border-emerald-800"; }
                  else if (evt.icone === "alert") { Icon = AlertTriangle; colorClass = "text-amber-500"; bgClass = "bg-amber-50 dark:bg-amber-900/20"; borderClass = "border-amber-300 dark:border-amber-700"; }
                  else if (evt.icone === "message") { Icon = MessageSquare; colorClass = "text-sky-500"; bgClass = "bg-sky-50 dark:bg-sky-900/20"; borderClass = "border-sky-200 dark:border-sky-800"; }

                  return (
                    <div key={evt.id} className="relative pb-6 last:pb-0">
                      <div className={`absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white dark:border-slate-900 ${colorClass.replace("text-", "bg-")} shadow-sm`} />
                      <div className={`rounded-xl border ${borderClass} ${bgClass} p-4 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500">
                          <Icon size={14} className={colorClass} />
                          {new Date(evt.data_evento).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{evt.titulo}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{evt.descricao}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-6 py-10 flex flex-col items-center gap-3 text-center">
                <Clock size={32} className="text-slate-400/50" />
                <p className="text-sm font-medium text-slate-500">Nenhum evento registrado no histórico.</p>
              </div>
            )}
          </div>
        )}

      </div>

      <ToastContainer />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
 * Componente: Fase Externa (Diário de Bordo)
 * ═══════════════════════════════════════════════════════════════════════════ */

function FaseExternaSection({
  projeto,
  onRefresh,
}: {
  projeto: ProjetoComDetalhes;
  onRefresh: () => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [observacoes, setObservacoes] = useState<ObservacaoFaseExterna[]>([]);
  const [loadingObs, setLoadingObs] = useState(true);
  const [novaObs, setNovaObs] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [showConcluirModal, setShowConcluirModal] = useState(false);

  useEffect(() => {
    if (projeto.status === "Fase externa" || projeto.status === "Contratado") {
      fetchObservacoesFaseExterna(projeto.id)
        .then(setObservacoes)
        .finally(() => setLoadingObs(false));
    } else {
      setLoadingObs(false);
    }
  }, [projeto.id, projeto.status]);

  /* ── Handlers ────────────────────────────────────────────────────────── */

  async function handleEnviar() {
    setActionLoading(true);
    try {
      await enviarParaLicitacao(projeto.id);
      showToast("success", "Projeto enviado para fase externa com sucesso!");
      onRefresh();
    } catch (err: any) {
      showToast("error", err.message ?? "Erro ao enviar para fase externa.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddObservacao() {
    if (!novaObs.trim()) {
      showToast("error", "Preencha a observação.");
      return;
    }
    setSavingObs(true);
    try {
      const added = await addObservacaoFaseExterna(projeto.id, novaObs.trim());
      setObservacoes([added, ...observacoes]);
      setNovaObs("");
      showToast("success", "Movimentação adicionada com sucesso!");
    } catch (err: any) {
      showToast("error", err.message ?? "Erro ao salvar movimentação.");
    } finally {
      setSavingObs(false);
    }
  }

  async function handleConcluir() {
    setActionLoading(true);
    try {
      await concluirLicitacao(projeto.id);
      showToast("success", "Fase Externa concluída com sucesso!");
      onRefresh();
    } catch (err: any) {
      showToast("error", err.message ?? "Erro ao concluir fase externa.");
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Formatação de data ──────────────────────────────────────────────── */

  function formatDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  /* ── Não exibir a seção se não estiver em um dos 3 estados ──────────── */

  const showSection =
    projeto.status === "Fase interna" ||
    projeto.status === "Fase externa" ||
    projeto.status === "Contratado";

  const todosArtefatosConcluidos =
    projeto.artefatos.length > 0 &&
    projeto.artefatos.every((a) => a.status === "Concluído");

  if (!showSection) return null;

  /* ── ESTADO 1: Fase Interna com artefatos concluídos ────────────────── */

  if (projeto.status === "Fase interna" && todosArtefatosConcluidos) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 p-6 dark:border-brand-primary/20">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-primary/10" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <Send size={16} />
            </div>
            <h3 className="text-sm font-bold text-brand-primary">
              Fase Externa
            </h3>
          </div>

          <p className="text-sm text-foreground-muted mb-4 max-w-xl">
            Todos os artefatos da fase interna foram concluídos. O projeto está
            pronto para iniciar a fase externa.
          </p>

          <button
            onClick={handleEnviar}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-xl hover:shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Iniciar Fase Externa
          </button>
        </div>
      </div>
    );
  }

  if (projeto.status === "Fase interna" && !todosArtefatosConcluidos) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-10 flex flex-col items-center gap-3 text-center">
        <Lock size={32} className="text-foreground-muted/30" />
        <p className="text-sm font-medium text-foreground-muted max-w-md">
          A Fase Externa está bloqueada. Para habilitá-la, conclua primeiro todos os artefatos obrigatórios da Fase Interna.
        </p>
      </div>
    );
  }

  /* ── ESTADO 2: Fase Externa ─────────────────────────────────────────── */

  if (projeto.status === "Fase externa") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-brand-primary/20 bg-background-card p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <PackageCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Fase Externa
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted mt-0.5">
                <CalendarClock size={11} />
                Iniciada em{" "}
                <strong>{formatDate(projeto.data_envio_licitacao)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Adicionar Movimentação */}
        <div className="mb-6 border-b border-border pb-6">
          <label
            htmlFor="diario-bordo"
            className="block text-xs font-bold uppercase tracking-wider text-foreground-muted mb-1.5"
          >
            Situação Atual - Adicionar Detalhes
          </label>
          <textarea
            id="diario-bordo"
            value={novaObs}
            onChange={(e) => setNovaObs(e.target.value)}
            rows={3}
            placeholder="Descreva o andamento atual, pendências ou movimentações..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors resize-none"
          />
          <button
            onClick={handleAddObservacao}
            disabled={savingObs || !novaObs.trim()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-all hover:bg-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingObs ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <span className="text-sm leading-none">+</span>
            )}
            Adicionar Movimentação
          </button>
        </div>

        {/* Lista de Movimentações */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-4">
            Histórico de Movimentações
          </h4>
          {loadingObs ? (
            <div className="flex justify-center py-4">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
            </div>
          ) : observacoes.length > 0 ? (
            <div className="space-y-3">
              {observacoes.map((obs) => (
                <div key={obs.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {obs.usuario?.nome || "Usuário do Sistema"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(obs.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{obs.texto}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-foreground-muted italic">
              Nenhuma movimentação registrada.
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-foreground-muted">
            Quando o processo for finalizado, conclua a fase externa
            para avançar o projeto.
          </p>
          <button
            onClick={() => setShowConcluirModal(true)}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {actionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trophy size={16} />
            )}
            Concluir Fase Externa
          </button>
        </div>

        {/* Modal Confirmação Conclusão */}
        {showConcluirModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl border border-border">
              <h3 className="mb-2 text-lg font-bold text-foreground">Concluir Fase Externa?</h3>
              <p className="mb-6 text-sm text-foreground-muted">
                Tem certeza que deseja finalizar a fase externa deste projeto? Certifique-se de que todas as movimentações foram registradas.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConcluirModal(false)}
                  disabled={actionLoading}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-foreground-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleConcluir();
                    setShowConcluirModal(false);
                  }}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Sim, Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── ESTADO 3: Contratado ───────────────────────────────────────────── */

  if (projeto.status === "Contratado") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 dark:border-emerald-800 dark:from-emerald-950/20 dark:to-teal-950/15">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/30 dark:bg-emerald-700/10" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Trophy size={16} />
            </div>
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Fase Externa Concluída com Sucesso
            </h3>
          </div>

          <div className="flex flex-wrap gap-8 mb-6">
            <div>
              <div className="text-xs uppercase text-emerald-700 dark:text-emerald-500 mb-1">
                Data de Início
              </div>
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                {formatDate(projeto.data_envio_licitacao)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-emerald-700 dark:text-emerald-500 mb-1">
                Data de Conclusão
              </div>
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                {projeto.tramitacoes && projeto.tramitacoes.length > 0 
                  ? formatDate(projeto.tramitacoes[0].data_hora) 
                  : observacoes.length > 0 
                    ? formatDate(observacoes[0].criado_em) 
                    : "—"}
              </div>
            </div>
          </div>

          {/* Diário de Bordo Readonly */}
          <div className="mb-4 mt-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70 mb-2">
              Histórico de Movimentações
            </h4>
            {loadingObs ? (
              <div className="text-xs text-emerald-600">Carregando...</div>
            ) : observacoes.length > 0 ? (
              <div className="space-y-2">
                {observacoes.map((obs) => (
                  <div key={obs.id} className="rounded border border-emerald-200/50 bg-emerald-100/30 p-2 text-xs text-emerald-800 dark:border-emerald-800/50 dark:text-emerald-300">
                    <span className="font-bold mr-2">{new Date(obs.criado_em).toLocaleDateString("pt-BR")}:</span>
                    {obs.texto}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-600 italic">Sem registros.</div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-100/50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Projeto pronto para geração de Contrato.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
