"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  FileSignature,
  Building2,
  Calendar,
  DollarSign,
  Hash,
  FolderKanban,
  FileText,
  Settings,
  Users,
  User,
  Clock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Link2,
  Layers,
  StickyNote,
  History,
  MessageSquare,
  Send,
  Cog,
  ArrowLeft,
} from "lucide-react";
import { fetchContrato, adicionarObservacaoContrato, criarAditivo } from "@/lib/api";
import type {
  ContratoResponse,
  ServidorResumo,
  EquipePapelResponse,
  HistoricoContrato,
  Aditivo,
} from "@/types/contrato";
import {
  TIPO_CONTRATO_CONFIG,
  SITUACAO_CONTRATO_CONFIG,
  MODALIDADE_CONTRATO_CONFIG,
  COMPLEXIDADE_CONTRATO_CONFIG,
} from "@/types/contrato";
import { formatarMoedaBRL, formatDate } from "@/lib/formatters";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extrai o nome legível de um campo autor que pode ser JSON bruto do cookie */
function parseAutorNome(autor: string | null | undefined): string {
  if (!autor) return "Usuário do Sistema";
  try {
    const parsed = JSON.parse(autor);
    if (parsed && typeof parsed === "object" && parsed.nome) {
      return parsed.nome;
    }
  } catch {
    // não é JSON, é string normal
  }
  return autor;
}

function InfoField({
  label,
  value,
  icon,
  mono,
  color,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
  mono?: boolean;
  color?: string;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
        {icon}
        {label}
      </div>
      <div
        className={`text-sm font-medium ${color ?? "text-foreground"} ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ServidorCard({
  servidor,
  badge,
  badgeCls,
}: {
  servidor: ServidorResumo;
  badge: string;
  badgeCls: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background-secondary px-3 py-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{servidor.nome}</div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-foreground-muted">
          <span>{servidor.cargo}</span>
          <span className="font-mono text-[11px]">Mat. {servidor.matricula}</span>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeCls}`}
      >
        {badge}
      </span>
    </div>
  );
}

function EquipePapelField({
  label,
  papel,
  icon,
}: {
  label: string;
  papel: EquipePapelResponse | null | undefined;
  icon?: React.ReactNode;
}) {
  const titulares = papel?.titulares ?? [];
  const substitutos = papel?.substitutos ?? [];
  const vazio = titulares.length === 0 && substitutos.length === 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/20">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
        {icon}
        {label}
      </div>
      {vazio ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-foreground-muted italic">
          Não designado
        </div>
      ) : (
        <div className="space-y-2">
          {titulares.map((titular) => (
            <ServidorCard
              key={titular.id}
              servidor={titular}
              badge="Titular"
              badgeCls="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            />
          ))}
          {substitutos.map((sub) => (
            <ServidorCard
              key={sub.id}
              servidor={sub}
              badge="Substituto"
              badgeCls="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Página Principal ──────────────────────────────────────────────────── */

export default function ContratoDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const contratoId = Number(id);

  const [contrato, setContrato] = useState<ContratoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "equipe" | "aditivos" | "complementares" | "historico">("visao-geral");

  // ── Observações
  const [obsTexto, setObsTexto] = useState("");
  const [sendingObs, setSendingObs] = useState(false);

  // ── Aditivos
  const [showAditivoForm, setShowAditivoForm] = useState(false);
  const [aditivoNumero, setAditivoNumero] = useState("");
  const [aditivoInicio, setAditivoInicio] = useState("");
  const [aditivoFim, setAditivoFim] = useState("");
  const [savingAditivo, setSavingAditivo] = useState(false);
  const [aditivoError, setAditivoError] = useState<string | null>(null);

  const loadContrato = useCallback(async () => {
    try {
      const data = await fetchContrato(contratoId);
      setContrato(data);
    } catch {
      setError("Erro ao carregar detalhes do contrato.");
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => {
    loadContrato();
  }, [loadContrato]);

  const handleEnviarObservacao = async () => {
    if (!obsTexto.trim()) return;
    setSendingObs(true);
    try {
      const rawUser = Cookies.get("itertic_user") || undefined;
      let username = rawUser;
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (parsed && typeof parsed === "object" && parsed.nome) {
            username = parsed.nome;
          }
        } catch {
          // not JSON, use as-is
        }
      }
      await adicionarObservacaoContrato(contratoId, obsTexto.trim(), username);
      setObsTexto("");
      await loadContrato();
    } catch {
      // silently fail or add toast
    } finally {
      setSendingObs(false);
    }
  };

  const handleSalvarAditivo = async () => {
    if (!aditivoNumero.trim() || !aditivoInicio || !aditivoFim) {
      setAditivoError("Preencha todos os campos do aditivo.");
      return;
    }
    if (aditivoFim < aditivoInicio) {
      setAditivoError("A data-fim deve ser posterior à data-início.");
      return;
    }
    setSavingAditivo(true);
    setAditivoError(null);
    try {
      await criarAditivo(contratoId, {
        numero_aditivo: aditivoNumero.trim(),
        data_inicio_vigencia: aditivoInicio,
        data_fim_vigencia: aditivoFim,
      });
      setAditivoNumero("");
      setAditivoInicio("");
      setAditivoFim("");
      setShowAditivoForm(false);
      await loadContrato();
    } catch (err) {
      setAditivoError(err instanceof Error ? err.message : "Erro ao criar aditivo.");
    } finally {
      setSavingAditivo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-red-500">
        <AlertCircle size={40} />
        <p className="text-lg">{error || "Contrato não encontrado."}</p>
        <Link href="/contratos" className="text-sm font-semibold underline mt-2">
          Voltar para Contratos
        </Link>
      </div>
    );
  }

  const tipoCfg = TIPO_CONTRATO_CONFIG[contrato.tipo_contrato];
  const sitCfg = SITUACAO_CONTRATO_CONFIG[contrato.situacao_atual];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
        
        {/* ── Botão Voltar ── */}
        <Link
          href="/contratos"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Voltar para Contratos
        </Link>

        {/* ── Cabeçalho do Contrato ── */}
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
              <FileSignature size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                {contrato.modalidade_contrato === 'ARP' ? 'ARP' : 'Contrato'} {String(contrato.numero).padStart(3, '0')}/{contrato.ano}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(() => {
                  const modCfg = MODALIDADE_CONTRATO_CONFIG[contrato.modalidade_contrato] ?? MODALIDADE_CONTRATO_CONFIG.CONTRATO;
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${modCfg.cls}`}>
                      {modCfg.icon} {modCfg.label}
                    </span>
                  );
                })()}
                {sitCfg && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${sitCfg.cls}`}>
                    {sitCfg.icon} {contrato.situacao_atual}
                  </span>
                )}
                {tipoCfg && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${tipoCfg.cls}`}>
                    {tipoCfg.icon} {contrato.tipo_contrato}
                  </span>
                )}
                {contrato.complexidade && (() => {
                  const compCfg = COMPLEXIDADE_CONTRATO_CONFIG[contrato.complexidade];
                  if (!compCfg) return null;
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${compCfg.cls}`}>
                      {compCfg.icon} Complexidade: {compCfg.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Navegação em Abas ── */}
        <div className="flex overflow-x-auto border-b border-border mb-6 no-scrollbar">
          <button
            onClick={() => setActiveTab("visao-geral")}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "visao-geral"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab("equipe")}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "equipe"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Equipe de Fiscalização
          </button>
          <button
            onClick={() => setActiveTab("aditivos")}
            className={`whitespace-nowrap flex items-center gap-2 px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "aditivos"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Aditivos de Prazo
            {contrato.aditivos && contrato.aditivos.length > 0 && (
               <span className="bg-brand-primary/10 text-brand-primary py-0.5 px-2 rounded-full text-[10px]">
                  {contrato.aditivos.length}
               </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("complementares")}
            className={`whitespace-nowrap flex items-center gap-2 px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "complementares"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Informações Complementares
            {contrato.historico && contrato.historico.filter(h => h.tipo_registro === "Observação Manual").length > 0 && (
               <span className="bg-brand-primary/10 text-brand-primary py-0.5 px-2 rounded-full text-[10px]">
                 {contrato.historico.filter(h => h.tipo_registro === "Observação Manual").length}
               </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "historico"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Histórico
          </button>
        </div>

        {/* ── Conteúdo da Aba ── */}
        <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm">
          {activeTab === "visao-geral" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Identificação */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField
                  label="Empresa Contratada"
                  value={contrato.fornecedor_nome}
                  icon={<Building2 size={12} />}
                />

                {contrato.modalidade_contrato === 'ARP' && contrato.orgao_gerenciador && (
                  <InfoField
                    label="Órgão Gerenciador"
                    value={contrato.orgao_gerenciador}
                    icon={<Building2 size={12} />}
                  />
                )}

              </div>

              <hr className="border-border" />

              {/* Valores */}
              {/* Itens e Valores */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                    <DollarSign size={14} />
                    Itens e Valor Total
                  </div>
                </div>
                
                <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Objeto</th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-32">Catálogo</th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-24 text-center">Qtd</th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-40 text-right">Valor Unit.</th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-40 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {contrato.itens && contrato.itens.length > 0 ? (
                        contrato.itens.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{item.catalogo_produto_nome || "Item sem nome"}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                              {item.tipo_catalogo && item.codigo_catalogo ? `${item.tipo_catalogo} - ${item.codigo_catalogo}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 font-mono">{item.quantidade}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 font-mono">{formatarMoedaBRL(item.valor_unitario)}</td>
                            <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-200 font-mono font-medium">{formatarMoedaBRL(item.quantidade * item.valor_unitario)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">Nenhum item cadastrado.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-emerald-50 dark:bg-emerald-950/20">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 text-xs">Valor Total do Contrato</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300 text-base">{formatarMoedaBRL(contrato.valor_total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <hr className="border-border" />

              {/* Vigência */}
              <div>
                <div className="mb-4 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                  <Calendar size={14} />
                  Vigência
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <InfoField
                    label="Data de Assinatura"
                    value={formatDate(contrato.data_assinatura)}
                    icon={<Calendar size={12} />}
                  />
                  <InfoField
                    label="Início de Vigência"
                    value={contrato.data_inicio_vigencia ? formatDate(contrato.data_inicio_vigencia) : formatDate(contrato.data_assinatura)}
                    icon={<Calendar size={12} />}
                  />
                  <InfoField
                    label={contrato.modalidade_contrato === 'ARP' ? "Validade da Ata" : "Data Fim de Vigência"}
                    value={formatDate(contrato.data_fim_vigencia)}
                    icon={<Calendar size={12} />}
                  />
                  <InfoField
                    label="Vigência"
                    value={contrato.vigencia_meses != null ? `${contrato.vigencia_meses} meses` : null}
                    icon={<Clock size={12} />}
                  />
                  <InfoField
                    label="Prorrogação"
                    value={contrato.prorrogacao_meses ? `${contrato.prorrogacao_meses} meses` : "Sem prorrogação"}
                    icon={<Clock size={12} />}
                  />
                </div>
              </div>

              <hr className="border-border" />

              {/* Projeto Origem */}
              <div>
                <div className="mb-4 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                  <FolderKanban size={14} />
                  Projeto de Origem
                </div>

                {contrato.projeto_origem ? (
                  <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-5 dark:border-brand-primary/40">
                    <div className="flex items-center gap-3">
                      <FolderKanban size={20} className="text-brand-primary" />
                      <span className="text-base font-bold text-brand-primary">
                        {contrato.projeto_origem.nome}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-brand-primary/80">
                      <FileText size={14} />
                      <span className="font-mono font-medium">
                        Processo SEI: {contrato.projeto_origem.processo_sei}
                      </span>
                    </div>

                    {/* Ações PDTIC */}
                    {contrato.acoes_pdtic_vinculadas.length > 0 && (
                       <div className="mt-5 border-t border-brand-primary/20 pt-4">
                        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
                          <Link2 size={12} />
                          Ações PDTIC Vinculadas
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {contrato.acoes_pdtic_vinculadas.map((acao) => (
                            <div
                              key={acao.id}
                              className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm border border-brand-primary/10 dark:bg-slate-900 dark:border-brand-primary/20"
                            >
                              <span className="shrink-0 rounded bg-brand-primary/10 px-2 py-1 text-xs font-extrabold text-brand-primary">
                                {acao.codigo_acao}
                              </span>
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">
                                {acao.descricao}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-5 py-6 text-sm text-foreground-muted italic text-center">
                    Nenhum projeto de origem vinculado.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "complementares" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              {/* Legacy Observations */}
              {contrato.observacoes && (
                <div className="mb-6 rounded-xl border border-border bg-background-secondary p-4">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Observação Inicial (Legado)
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {contrato.observacoes}
                  </div>
                </div>
              )}

              {/* Form to submit new observation */}
              <div className="mb-6 flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={obsTexto}
                    onChange={(e) => setObsTexto(e.target.value)}
                    placeholder="Adicione uma observação complementar..."
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/60 resize-none focus:border-brand-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/20 shadow-sm transition-all"
                  />
                </div>
                <button
                  onClick={handleEnviarObservacao}
                  disabled={!obsTexto.trim() || sendingObs}
                  className="flex h-[46px] items-center gap-2 self-start rounded-xl bg-brand-primary px-5 text-sm font-bold text-white shadow-md shadow-brand-primary/20 transition-all hover:shadow-lg hover:bg-brand-primary-hover disabled:opacity-40"
                >
                  {sendingObs ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Registrar
                </button>
              </div>

              {/* Historical observations of type "Observação Manual" */}
              {contrato.historico && contrato.historico.filter(h => h.tipo_registro === "Observação Manual").length > 0 && (
                <div className="space-y-4 border-t border-border pt-6">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                    Histórico de Observações
                  </div>
                  <div className="space-y-3">
                    {contrato.historico
                      .filter(h => h.tipo_registro === "Observação Manual")
                      .map((obs) => (
                        <div key={obs.id} className="rounded-xl border border-border bg-background-secondary p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground">
                              {parseAutorNome(obs.autor)}
                            </span>
                            <span className="text-[10px] text-foreground-muted">
                              {formatDateTime(obs.data_hora)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {obs.conteudo}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "equipe" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                <ShieldCheck size={16} className="text-brand-primary" />
                Membros Designados
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <EquipePapelField
                  label="Gestor do Contrato"
                  papel={contrato.equipe?.gestor}
                  icon={<User size={14} />}
                />
                <EquipePapelField
                  label="Fiscal Requisitante"
                  papel={contrato.equipe?.fiscal_requisitante}
                  icon={<Users size={14} />}
                />
                <EquipePapelField
                  label="Fiscal Técnico"
                  papel={contrato.equipe?.fiscal_tecnico}
                  icon={<Users size={14} />}
                />
                <EquipePapelField
                  label="Fiscal Administrativo"
                  papel={contrato.equipe?.fiscal_administrativo}
                  icon={<Users size={14} />}
                />
              </div>
            </div>
          )}

          {activeTab === "aditivos" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                  <Layers size={16} className="text-brand-primary" />
                  Controle de Prazo
                </div>
                <button
                  onClick={() => { setShowAditivoForm(!showAditivoForm); setAditivoError(null); }}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/25 hover:bg-brand-primary-hover hover:shadow-lg transition-all"
                >
                  <span className="text-lg leading-none">+</span>
                  Novo Aditivo
                </button>
              </div>

              {showAditivoForm && (
                <div className="mb-6 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-brand-primary mb-4">Adicionar Termo Aditivo de Prazo</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                        Número do Aditivo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={aditivoNumero}
                        onChange={(e) => setAditivoNumero(e.target.value)}
                        placeholder="Ex: 1º Termo Aditivo"
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:bg-background"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                        Data Início <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={aditivoInicio}
                        onChange={(e) => setAditivoInicio(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:bg-background"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                        Data Fim <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={aditivoFim}
                        onChange={(e) => setAditivoFim(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:bg-background"
                      />
                    </div>
                  </div>
                  {aditivoError && (
                    <p className="mt-3 text-xs font-semibold text-red-500">{aditivoError}</p>
                  )}
                  <div className="mt-5 flex justify-end gap-3 border-t border-brand-primary/10 pt-4">
                    <button
                      onClick={() => { setShowAditivoForm(false); setAditivoError(null); }}
                      className="rounded-xl border border-border px-5 py-2 text-sm font-semibold text-foreground-muted hover:bg-background-secondary transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSalvarAditivo}
                      disabled={savingAditivo}
                      className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-primary-hover disabled:opacity-50"
                    >
                      {savingAditivo ? <Loader2 size={16} className="animate-spin" /> : null}
                      Salvar Aditivo
                    </button>
                  </div>
                </div>
              )}

              {contrato.aditivos && contrato.aditivos.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-background-secondary border-b border-border">
                      <tr>
                        <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider text-foreground-muted text-[11px]">Aditivo</th>
                        <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider text-foreground-muted text-[11px]">Data Início</th>
                        <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider text-foreground-muted text-[11px]">Data Fim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background-card">
                      {contrato.aditivos.map((ad: Aditivo) => (
                        <tr key={ad.id} className="hover:bg-background-secondary/40 transition-colors">
                          <td className="px-5 py-4 font-semibold text-foreground">{ad.numero_aditivo}</td>
                          <td className="px-5 py-4 text-foreground-muted">{formatDate(ad.data_inicio_vigencia)}</td>
                          <td className="px-5 py-4 font-bold text-brand-primary">{formatDate(ad.data_fim_vigencia)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center flex flex-col items-center gap-3">
                   <Layers size={32} className="text-foreground-muted/30" />
                   <p className="text-sm font-medium text-foreground-muted">Nenhum aditivo de prazo registrado.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "historico" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground-muted">
                <History size={16} className="text-brand-primary" />
                Linha do Tempo
              </div>



              {/* Timeline */}
              {contrato.historico && contrato.historico.length > 0 ? (
                <div className="relative space-y-0 pl-7 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-border/60">
                  {contrato.historico.map((h: HistoricoContrato) => {
                    const isEdition = h.tipo_registro === "Edição de Sistema";
                    return (
                      <div key={h.id} className="relative pb-6 last:pb-0">
                        {/* Dot */}
                        <div className={`absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-background ${
                          isEdition
                            ? "bg-gray-300 dark:bg-gray-600"
                            : "bg-brand-primary shadow-sm shadow-brand-primary/30"
                        }`}>
                          {isEdition
                            ? <Cog size={10} className="text-white dark:text-gray-900" />
                            : <MessageSquare size={10} className="text-white" />
                          }
                        </div>

                        {/* Content */}
                        <div className={`rounded-2xl border p-4 shadow-sm ${
                          isEdition
                            ? "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30"
                            : "border-brand-primary/10 bg-brand-primary/5 dark:border-brand-primary/20"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
                              isEdition
                                ? "text-gray-500 dark:text-gray-400"
                                : "text-brand-primary"
                            }`}>
                              {isEdition ? <><Cog size={12}/> Edição Automática</> : <><MessageSquare size={12}/> Observação Manual</>}
                            </span>
                            <span className="text-[11px] font-medium text-foreground-muted font-mono">
                              {formatDateTime(h.data_hora)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {h.conteudo}
                          </p>
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-foreground-muted">
                             <User size={12} />
                             <span>
                               por <strong className="text-foreground">{parseAutorNome(h.autor)}</strong>
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-6 py-10 flex flex-col items-center gap-3 text-center">
                   <History size={32} className="text-foreground-muted/30" />
                   <p className="text-sm font-medium text-foreground-muted">Nenhum registro no histórico ainda.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Timestamps (Footer) ── */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-foreground-muted/60 font-mono">
          <span>Criado em: {formatDateTime(contrato.criado_em)}</span>
          <span>Atualizado em: {formatDateTime(contrato.atualizado_em)}</span>
          <span>Contrato ID #{contrato.id}</span>
        </div>

    </div>
  );
}
