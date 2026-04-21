"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
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
} from "lucide-react";
import { fetchContrato, adicionarObservacaoContrato } from "@/lib/api";
import type { ContratoResponse, ServidorResumo, EquipePapelResponse, HistoricoContrato } from "@/types/contrato";
import {
  TIPO_CONTRATO_CONFIG,
  SITUACAO_CONTRATO_CONFIG,
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

/* ── InfoField — campo de detalhe padronizado ──────────────────────────── */

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
        className={`text-sm font-medium ${color ?? "text-foreground"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ── ServidorCard — exibe nome, cargo e matrícula com badge ─────────────── */

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
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeCls}`}>
        {badge}
      </span>
    </div>
  );
}

/* ── EquipePapelField — exibe titular + substitutos de um papel ────────── */

function EquipePapelField({
  label,
  papel,
  icon,
}: {
  label: string;
  papel: EquipePapelResponse | null | undefined;
  icon?: React.ReactNode;
}) {
  const titular = papel?.titular;
  const substitutos = papel?.substitutos ?? [];
  const vazio = !titular && substitutos.length === 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-3 space-y-2 bg-slate-50/30 dark:bg-slate-900/20">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
        {icon}
        {label}
      </div>
      {vazio ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-foreground-muted italic">
          Não designado
        </div>
      ) : (
        <div className="space-y-1.5">
          {titular && (
            <ServidorCard
              servidor={titular}
              badge="Titular"
              badgeCls="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            />
          )}
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

/* ── DetalheContratoModal ──────────────────────────────────────────────── */

interface DetalheContratoModalProps {
  contratoId: number;
  onClose: () => void;
}

export function DetalheContratoModal({
  contratoId,
  onClose,
}: DetalheContratoModalProps) {
  const [contrato, setContrato] = useState<ContratoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obsTexto, setObsTexto] = useState("");
  const [sendingObs, setSendingObs] = useState(false);

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

  useEffect(() => { loadContrato(); }, [loadContrato]);

  const handleEnviarObservacao = async () => {
    if (!obsTexto.trim()) return;
    setSendingObs(true);
    try {
      await adicionarObservacaoContrato(contratoId, obsTexto.trim());
      setObsTexto("");
      await loadContrato(); // refresh timeline
    } catch {
      // silently fail
    } finally {
      setSendingObs(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tipoCfg = contrato
    ? TIPO_CONTRATO_CONFIG[contrato.tipo_contrato]
    : null;
  const sitCfg = contrato
    ? SITUACAO_CONTRATO_CONFIG[contrato.situacao_atual]
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-background-card shadow-2xl mb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20">
              <FileSignature size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {loading ? "Carregando..." : `Contrato ${contrato?.numero_contrato}`}
              </h2>
              <p className="text-xs text-foreground-muted">
                Detalhes completos do contrato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-cyan-500" />
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-red-500">
            <AlertCircle size={28} />
            <p className="text-sm">{error}</p>
          </div>
        ) : contrato ? (
          <div className="space-y-0 divide-y divide-border">
            {/* ── Seção 1: Status & Identificação ──────────────── */}
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {sitCfg && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${sitCfg.cls}`}>
                    {sitCfg.icon} {contrato.situacao_atual}
                  </span>
                )}
                {tipoCfg && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tipoCfg.cls}`}>
                    {tipoCfg.icon} {contrato.tipo_contrato}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField
                  label="Número do Contrato"
                  value={contrato.numero_contrato}
                  icon={<Hash size={10} />}
                  mono
                />
                <InfoField
                  label="Empresa Contratada"
                  value={contrato.empresa_contratada}
                  icon={<Building2 size={10} />}
                />
                <InfoField
                  label="Fabricante"
                  value={contrato.fabricante_nome}
                  icon={<Layers size={10} />}
                />
                <InfoField
                  label="Quantidade"
                  value={`${contrato.quantidade} unidades`}
                  icon={<Hash size={10} />}
                />
                <InfoField
                  label="Tecnologia Utilizada"
                  value={contrato.tecnologia_utilizada}
                  icon={<Settings size={10} />}
                />
              </div>
            </div>

            {/* ── Seção 2: Valores Financeiros ─────────────────── */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                <DollarSign size={12} />
                Valores Financeiros
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Investimento (CAPEX)
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-blue-700 font-mono dark:text-blue-300">
                    {formatarMoedaBRL(contrato.valor_investimento)}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Custeio (OPEX)
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-amber-700 font-mono dark:text-amber-300">
                    {formatarMoedaBRL(contrato.valor_custeio)}
                  </div>
                </div>
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Valor Total
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-700 font-mono dark:text-emerald-300">
                    {formatarMoedaBRL(contrato.valor_total)}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Seção 3: Vigência ────────────────────────────── */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                <Calendar size={12} />
                Vigência
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InfoField
                  label="Data de Assinatura"
                  value={formatDate(contrato.data_assinatura)}
                  icon={<Calendar size={10} />}
                />
                <InfoField
                  label="Data Fim de Vigência"
                  value={formatDate(contrato.data_fim_vigencia)}
                  icon={<Calendar size={10} />}
                />
                <InfoField
                  label="Prazo"
                  value={contrato.prazo}
                  icon={<Clock size={10} />}
                />
              </div>
            </div>

            {/* ── Seção 4: Projeto de Origem & Ações PDTIC ─────── */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                <FolderKanban size={12} />
                Projeto de Origem
              </div>

              {contrato.projeto_origem ? (
                <div className="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
                  <div className="flex items-center gap-2">
                    <FolderKanban size={16} className="text-violet-600 dark:text-violet-400" />
                    <span className="text-sm font-bold text-violet-800 dark:text-violet-300">
                      {contrato.projeto_origem.nome}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-violet-600/70 dark:text-violet-400/60">
                    <FileText size={11} />
                    <span className="font-mono">
                      SEI: {contrato.projeto_origem.processo_sei}
                    </span>
                  </div>

                  {/* Ações PDTIC vinculadas */}
                  {contrato.acoes_pdtic_vinculadas.length > 0 && (
                    <div className="mt-3 border-t border-violet-200 pt-3 dark:border-violet-800">
                      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-500">
                        <Link2 size={9} />
                        Ações PDTIC Vinculadas
                      </div>
                      <div className="space-y-1">
                        {contrato.acoes_pdtic_vinculadas.map((acao) => (
                          <div
                            key={acao.id}
                            className="flex items-start gap-2 rounded-lg bg-violet-100/60 px-2.5 py-1.5 dark:bg-violet-900/30"
                          >
                            <span className="shrink-0 rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-800 dark:text-violet-300">
                              {acao.codigo_acao}
                            </span>
                            <span className="text-xs text-violet-800 dark:text-violet-300">
                              {acao.descricao}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-foreground-muted italic">
                  Nenhum projeto de origem vinculado.
                </div>
              )}
            </div>

            {/* ── Seção 5: Equipe de Fiscalização ──────────────── */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                <ShieldCheck size={12} />
                Equipe de Fiscalização
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <EquipePapelField
                  label="Gestor do Contrato"
                  papel={contrato.equipe?.gestor}
                  icon={<User size={10} />}
                />
                <EquipePapelField
                  label="Fiscal Requisitante"
                  papel={contrato.equipe?.fiscal_requisitante}
                  icon={<Users size={10} />}
                />
                <EquipePapelField
                  label="Fiscal Técnico"
                  papel={contrato.equipe?.fiscal_tecnico}
                  icon={<Users size={10} />}
                />
                <EquipePapelField
                  label="Fiscal Administrativo"
                  papel={contrato.equipe?.fiscal_administrativo}
                  icon={<Users size={10} />}
                />
              </div>
            </div>

            {/* ── Seção 6: Observações ─────────────────────────── */}
            {contrato.observacoes && (
              <div className="px-6 py-5">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  <StickyNote size={12} />
                  Observações
                </div>
                <div className="rounded-xl border border-border bg-background-secondary p-4 text-sm text-foreground whitespace-pre-wrap">
                  {contrato.observacoes}
                </div>
              </div>
            )}

            {/* ── Seção 7: Histórico e Observações (Timeline) ──── */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                <History size={12} />
                Histórico e Observações
              </div>

              {/* Formulário inline para nova observação */}
              <div className="mb-4 flex gap-2">
                <textarea
                  value={obsTexto}
                  onChange={(e) => setObsTexto(e.target.value)}
                  placeholder="Adicione uma observação ao histórico..."
                  rows={2}
                  className="flex-1 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 resize-none focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
                <button
                  onClick={handleEnviarObservacao}
                  disabled={!obsTexto.trim() || sendingObs}
                  className="flex h-auto items-center gap-1.5 self-end rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:shadow-lg disabled:opacity-40"
                >
                  {sendingObs ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Enviar
                </button>
              </div>

              {/* Timeline */}
              {contrato.historico && contrato.historico.length > 0 ? (
                <div className="relative space-y-0 pl-5 before:absolute before:left-[7px] before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
                  {contrato.historico.map((h: HistoricoContrato) => {
                    const isEdition = h.tipo_registro === "Edição de Sistema";
                    return (
                      <div key={h.id} className="relative pb-4">
                        {/* Dot */}
                        <div className={`absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                          isEdition
                            ? "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                            : "border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950"
                        }`}>
                          {isEdition
                            ? <Cog size={7} className="text-gray-500 dark:text-gray-400" />
                            : <MessageSquare size={7} className="text-cyan-600 dark:text-cyan-400" />
                          }
                        </div>

                        {/* Content */}
                        <div className={`rounded-lg border px-3 py-2 ${
                          isEdition
                            ? "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30"
                            : "border-cyan-200 bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/20"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isEdition
                                ? "text-gray-500 dark:text-gray-400"
                                : "text-cyan-600 dark:text-cyan-400"
                            }`}>
                              {isEdition ? "⚙️ Edição Automática" : "💬 Observação"}
                            </span>
                            <span className="text-[10px] text-foreground-muted">
                              {formatDateTime(h.data_hora)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground whitespace-pre-wrap">
                            {h.conteudo}
                          </p>
                          <div className="mt-1 text-[10px] text-foreground-muted">
                            por <strong>{h.autor}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-foreground-muted italic text-center">
                  Nenhum registro no histórico.
                </div>
              )}
            </div>

            {/* ── Seção 8: Timestamps ─────────────────────────────────── */}
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-foreground-muted">
                <span>
                  <Clock size={10} className="mr-1 inline" />
                  Criado em: <strong className="text-foreground">{formatDateTime(contrato.criado_em)}</strong>
                </span>
                <span>
                  <Clock size={10} className="mr-1 inline" />
                  Atualizado em: <strong className="text-foreground">{formatDateTime(contrato.atualizado_em)}</strong>
                </span>
                <span>
                  ID: <strong className="font-mono text-foreground">#{contrato.id}</strong>
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
