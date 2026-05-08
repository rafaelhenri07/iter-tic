"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  CheckCircle2,
  Loader2,
  Clock,
  Send,
  MessageSquare,
  User,
  CalendarDays,
  Pencil,
  Play,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO, isValid, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  atualizarArtefato,
  listarComentariosArtefato,
  adicionarComentarioArtefato,
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { DatePickerField } from "@/components/ui/DatePickerField";
import type { ArtefatoResumo, ComentarioArtefato } from "@/types/projeto";

/* ── Labels ─────────────────────────────────────────────────────────────── */

const ARTEFATO_FULL: Record<string, string> = {
  DFD: "Documento de Formalização da Demanda",
  ETP: "Estudo Técnico Preliminar",
  "Mapa de Riscos": "Mapa de Gerenciamento de Riscos",
  "Estimativa de Custos e Orçamento": "Estimativa de Custos e Orçamento",
  TR: "Termo de Referência",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : iso;
}

function formatDateTimeRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHrs < 24) return `há ${diffHrs}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimeFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const isAuditComment = (conteudo: string) => conteudo.startsWith("⏰");

/* ── Props ──────────────────────────────────────────────────────────────── */

interface GerenciarArtefatoModalProps {
  projetoId: number;
  artefato: ArtefatoResumo;
  onClose: () => void;
  onSuccess: () => void;
}

export function GerenciarArtefatoModal({
  artefato,
  onClose,
  onSuccess,
}: GerenciarArtefatoModalProps) {
  /* ── State global ─────────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(false);
  const [novoComentario, setNovoComentario] = useState("");
  const [comentarios, setComentarios] = useState<ComentarioArtefato[]>([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  /* ── Cenário 1: Iniciar ───────────────────────────────────────────────── */
  const [dataInicioNovo, setDataInicioNovo] = useState<string | null>(null);

  /* ── Cenário 2a: Concluir ─────────────────────────────────────────────── */
  const [dataConclusao, setDataConclusao] = useState<string | null>(null);
  const [justificativaAtraso, setJustificativaAtraso] = useState("");

  /* ── Cenário 2b: Editar Data de Início ───────────────────────────────── */
  const [editandoDataInicio, setEditandoDataInicio] = useState(false);
  const [dataInicioEditada, setDataInicioEditada] = useState<string | null>(
    artefato.data_inicio?.slice(0, 10) ?? null
  );
  const [justificativa, setJustificativa] = useState("");

  const artefatoId = artefato.id;
  const isNaoIniciado = artefato.status === "Não iniciado";
  const isIniciado = artefato.status === "Iniciado";
  const isConcluido = artefato.status === "Concluído";

  /* ── SLA: lógica de atraso ───────────────────────────────────────────── */
  const isAtrasadoModal = (() => {
    if (!artefato.data_fim_prevista) return false;
    const prazo = parseISO(artefato.data_fim_prevista);
    if (!isValid(prazo)) return false;
    if (isConcluido && artefato.data_conclusao) {
      const conc = parseISO(artefato.data_conclusao);
      return isValid(conc) && conc > prazo;
    }
    if (isIniciado) return new Date() > prazo;
    return false;
  })();

  const conclusaoUltrapassaPrazo = (() => {
    if (!dataConclusao || !artefato.data_fim_prevista) return false;
    const prazo = parseISO(artefato.data_fim_prevista);
    const conc = parseISO(dataConclusao);
    return isValid(prazo) && isValid(conc) && conc > prazo;
  })();

  /* ── Comentários ──────────────────────────────────────────────────────── */

  const carregarComentarios = useCallback(async () => {
    if (!artefatoId) return;
    setLoadingComentarios(true);
    try {
      const data = await listarComentariosArtefato(artefatoId);
      setComentarios(data);
    } catch { /* silent */ }
    finally { setLoadingComentarios(false); }
  }, [artefatoId]);

  useEffect(() => { carregarComentarios(); }, [carregarComentarios]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ── Ação: Iniciar ────────────────────────────────────────────────────── */

  const handleIniciar = async () => {
    if (!artefatoId || !dataInicioNovo) return;
    setLoading(true);
    try {
      await atualizarArtefato(artefatoId, {
        status: "Iniciado",
        data_inicio: dataInicioNovo,
      });
      showToast("success", `${artefato.tipo} iniciado com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao iniciar.");
    } finally { setLoading(false); }
  };

  /* ── Validação: Data de Conclusão ──────────────────────────────────────── */

  const erroDataConclusao = useMemo(() => {
    if (!dataConclusao) return null;
    if (!artefato.data_inicio) return null;
    const inicio = parseISO(artefato.data_inicio.slice(0, 10));
    const conclusao = parseISO(dataConclusao);
    if (isValid(inicio) && isValid(conclusao) && isBefore(conclusao, inicio)) {
      return "A Data de Conclusão não pode ser anterior à Data de Início.";
    }
    return null;
  }, [dataConclusao, artefato.data_inicio]);

  const podeConcluir = !!dataConclusao && !erroDataConclusao && (!conclusaoUltrapassaPrazo || justificativaAtraso.trim().length >= 10);

  /* ── Ação: Concluir ───────────────────────────────────────────────────── */

  const handleConcluir = async () => {
    if (!artefatoId || !podeConcluir) return;
    setLoading(true);
    try {
      await atualizarArtefato(artefatoId, {
        status: "Concluído",
        data_conclusao: dataConclusao,
        ...(conclusaoUltrapassaPrazo ? { justificativa_atraso: justificativaAtraso.trim() } : {}),
      });
      showToast("success", `${artefato.tipo} concluído! 🎉`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao concluir.");
    } finally { setLoading(false); }
  };

  /* ── Ação: Salvar edição de Data de Início ────────────────────────────── */

  const handleSalvarDataInicio = async () => {
    if (!artefatoId || !dataInicioEditada || justificativa.trim().length < 10) return;
    setLoading(true);
    try {
      await atualizarArtefato(artefatoId, {
        data_inicio: dataInicioEditada,
        justificativa_alteracao: justificativa.trim(),
      });
      showToast("success", "Data de Início atualizada e justificativa registrada.");
      setEditandoDataInicio(false);
      setJustificativa("");
      await carregarComentarios();
      onSuccess();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setLoading(false); }
  };

  /* ── Ação: Comentário ─────────────────────────────────────────────────── */

  const handleEnviarComentario = async () => {
    if (!artefatoId || !novoComentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await adicionarComentarioArtefato(artefatoId, novoComentario.trim());
      setNovoComentario("");
      showToast("success", "Comentário adicionado.");
      await carregarComentarios();
      onSuccess();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao enviar.");
    } finally { setEnviandoComentario(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarComentario();
    }
  };

  /* ── Status pill ─────────────────────────────────────────────────────── */

  const statusCls = isConcluido
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    : isIniciado
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg flex-col rounded-2xl border border-border bg-background-card shadow-2xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">{artefato.tipo}</h2>
            <p className="text-[11px] text-foreground-muted">
              {ARTEFATO_FULL[artefato.tipo] ?? artefato.tipo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusCls}`}>
              {artefato.status}
            </span>
            {artefato.dias_decorridos != null && (
              <span className="flex items-center gap-1 text-xs text-foreground-muted">
                <Clock size={11} />
                {artefato.dias_decorridos}d {isConcluido ? "total" : "em andamento"}
              </span>
            )}
          </div>

          {/* ── CENÁRIO 1: Não Iniciado ─────────────────────────────────────── */}
          {isNaoIniciado && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                <Play size={11} />
                Definir Data de Início
              </p>

              <DatePickerField
                id="data-inicio-novo"
                label="Data de Início"
                required
                placeholder="Selecione a data de início"
                value={dataInicioNovo}
                onChange={setDataInicioNovo}
              />

              <button
                onClick={handleIniciar}
                disabled={!dataInicioNovo || loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Iniciar Artefato
              </button>
            </div>
          )}

          {/* ── CENÁRIO 2: Já Iniciado ──────────────────────────────────────── */}
          {isIniciado && (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">

              {/* 2a: Data de Início em texto + lápis para editar */}
              <div>
                {!editandoDataInicio ? (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-medium text-foreground">Início:</span>{" "}
                        {fmtDate(artefato.data_inicio)}
                      </div>
                      {artefato.data_inicio && <span className="text-slate-300 dark:text-slate-600">|</span>}
                      {artefato.data_fim_prevista && (
                        <div className={isAtrasadoModal ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                          <span className={`font-medium ${isAtrasadoModal ? "" : "text-foreground"}`}>Prazo Limite:</span>{" "}
                          {fmtDate(artefato.data_fim_prevista)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setEditandoDataInicio(true)}
                      className="flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/20"
                      title="Editar Data de Início (requer justificativa)"
                    >
                      <Pencil size={11} />
                      Editar
                    </button>
                  </div>
                ) : (
                  /* Formulário de edição com justificativa */
                  <div className="space-y-3 border-b border-amber-200 pb-4 dark:border-amber-800/40">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <Pencil size={11} />
                      Editar Data de Início
                    </p>

                    <DatePickerField
                      id="data-inicio-editada"
                      label="Nova Data de Início"
                      required
                      value={dataInicioEditada}
                      onChange={setDataInicioEditada}
                    />

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                        Justificativa <span className="text-rose-500">*</span>
                        <span className="ml-1 font-normal text-foreground-muted/70">(mín. 10 caracteres)</span>
                      </label>
                      <textarea
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        placeholder="Descreva o motivo da alteração da data..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                      />
                      <div className="mt-0.5 text-right text-[10px] text-foreground-muted">
                        {justificativa.length} / 10 mín.
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditandoDataInicio(false); setJustificativa(""); setDataInicioEditada(artefato.data_inicio?.slice(0, 10) ?? null); }}
                        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarDataInicio}
                        disabled={!dataInicioEditada || justificativa.trim().length < 10 || loading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                        Salvar Alteração
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2b: Data de Conclusão + botão Concluir */}
              {!editandoDataInicio && (
                <div className="space-y-3">
                  <DatePickerField
                    id="data-conclusao"
                    label="Data de Conclusão"
                    required
                    placeholder="Selecione a data de conclusão"
                    value={dataConclusao}
                    onChange={setDataConclusao}
                    minDate={artefato.data_inicio?.slice(0, 10)}
                  />

                  {/* Erro de validação */}
                  {erroDataConclusao && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-800/40 dark:bg-rose-900/10">
                      <AlertCircle size={13} className="shrink-0 text-rose-500" />
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        {erroDataConclusao}
                      </span>
                    </div>
                  )}

                  {/* Justificativa de Atraso (condicional) */}
                  {conclusaoUltrapassaPrazo && (
                    <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2.5 dark:border-red-800/30 dark:bg-red-900/10">
                      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        <AlertTriangle size={10} />
                        Justificativa de Atraso <span className="text-red-500">*</span>
                        <span className="ml-1 font-normal text-red-400/70">(mín. 10 caracteres)</span>
                      </label>
                      <textarea
                        value={justificativaAtraso}
                        onChange={(e) => setJustificativaAtraso(e.target.value)}
                        placeholder="Descreva o motivo do atraso..."
                        rows={2}
                        className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-foreground placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-400/30 dark:border-slate-700 dark:bg-slate-900/50 dark:placeholder:text-slate-600 dark:focus:bg-background"
                      />
                      <div className="text-right text-[10px] text-red-400">
                        {justificativaAtraso.length} / 10 mín.
                      </div>
                    </div>
                  )}

                  {/* Dica quando ainda não selecionou */}
                  {!dataConclusao && !erroDataConclusao && !conclusaoUltrapassaPrazo && (
                    <p className="text-[11px] text-foreground-muted/70 italic">
                      Selecione a data em que o documento foi finalizado.
                    </p>
                  )}

                  <button
                    onClick={handleConcluir}
                    disabled={!podeConcluir || loading}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Concluir Artefato
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Concluído: info de datas + SLA ──────────────────────────────────── */}
          {isConcluido && (
            <div className="space-y-3">
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border p-4 text-sm text-slate-500 dark:text-slate-400 ${
                isAtrasadoModal
                  ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-900/10"
                  : "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-900/10"
              }`}>
                <div>
                  <span className="font-medium text-foreground">Início:</span>{" "}
                  {fmtDate(artefato.data_inicio)}
                </div>
                {artefato.data_inicio && <span className="text-slate-300 dark:text-slate-600">|</span>}
                
                {artefato.data_fim_prevista && (
                  <>
                    <div className={isAtrasadoModal ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                      <span className={`font-medium ${isAtrasadoModal ? "" : "text-foreground"}`}>Prazo Limite:</span>{" "}
                      {fmtDate(artefato.data_fim_prevista)}
                    </div>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                  </>
                )}

                <div>
                  <span className="font-medium text-foreground">Fim:</span>{" "}
                  {fmtDate(artefato.data_conclusao)}
                </div>
              </div>

              {/* Justificativa registrada (readonly) */}
              {isAtrasadoModal && artefato.justificativa_atraso && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
                    <AlertTriangle size={10} />
                    Justificativa de Atraso Registrada
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed whitespace-pre-wrap">
                    {artefato.justificativa_atraso}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Novo Comentário ─────────────────────────────────────────────── */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              <MessageSquare size={10} />
              Novo Comentário
            </label>
            <div className="flex gap-2">
              <textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Adicione um comentário ou observação..."
                rows={2}
                className="flex-1 resize-none rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              />
              <button
                onClick={handleEnviarComentario}
                disabled={enviandoComentario || !novoComentario.trim()}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center self-end rounded-lg bg-violet-600 text-white shadow-md transition-all hover:bg-violet-700 disabled:opacity-40"
                title="Enviar comentário (Enter)"
              >
                {enviandoComentario ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>

          {/* ── Timeline de Comentários ─────────────────────────────────────── */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              <Clock size={10} />
              Histórico ({comentarios.length})
            </label>

            {loadingComentarios ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-violet-500" />
              </div>
            ) : comentarios.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <MessageSquare size={20} className="mb-1 text-slate-300 dark:text-slate-600" />
                <span className="text-xs text-foreground-muted">Nenhum comentário ainda.</span>
              </div>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />

                {comentarios.map((c) => {
                  const isAudit = isAuditComment(c.conteudo);
                  return (
                    <div key={c.id} className="relative flex gap-3 py-2">
                      <div className={`relative z-10 mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${
                        isAudit
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                      }`}>
                        {isAudit ? <Clock size={12} /> : <User size={12} />}
                      </div>

                      <div className={`flex-1 min-w-0 rounded-lg border px-3 py-2 ${
                        isAudit
                          ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10"
                          : "border-border bg-background-secondary/50"
                      }`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[11px] font-semibold ${isAudit ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
                            {c.autor}
                          </span>
                          <span
                            className="text-[10px] text-foreground-muted shrink-0"
                            title={formatDateTimeFull(c.criado_em)}
                          >
                            {formatDateTimeRelative(c.criado_em)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                          {c.conteudo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
