"use client";

import {
  ChevronRight,
  Check,
  MessageSquare,
  Pencil,
} from "lucide-react";
import type { ProjetoListagem, ArtefatoResumo, StatusProjeto, ComplexidadeProjeto, PrioridadeProjeto } from "@/types/projeto";
import {
  PRIORIDADE_CONFIG,
  COMPLEXIDADE_CONFIG,
} from "@/types/projeto";

/* ── Badges Sólidos Suaves ─────────────────────────────────────────────── */

// Removido PRIORIDADE_PILL, usando PRIORIDADE_CONFIG do types

const STATUS_PILL: Record<StatusProjeto, string> = {
  "Em elaboração": "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/50",
  "Pronto para contratação": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50",
  "Em licitação": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-400 dark:border-fuchsia-800/50",
  "Licitação concluída": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50",
  Suspenso: "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-900/40 dark:text-neutral-400 dark:border-neutral-800/50",
  Cancelado: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50",
};

/* ── Mapeamento curto de tipos de artefato ─────────────────────────────── */

const ARTEFATO_SHORT: Record<string, string> = {
  DFD: "DFD",
  ETP: "ETP",
  "Mapa de Riscos": "Riscos",
  "Estimativa de Custos e Orçamento": "Custos",
  TR: "TR",
};

/* ── Helper: formatar data DD/MM/YYYY ──────────────────────────────────── */

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR");
}

/* ── Tooltip Avançado (artefatos) ──────────────────────────────────────── */

function ArtefatoTooltip({
  artefato,
  children,
}: {
  artefato: ArtefatoResumo;
  children: React.ReactNode;
}) {
  const inicio = fmtDate(artefato.data_inicio);
  const fim = fmtDate(artefato.data_conclusao);
  const dias = artefato.dias_decorridos;
  const comentarios = artefato.comentarios ?? [];

  const temConteudo = inicio || fim || comentarios.length > 0;
  if (!temConteudo) return <>{children}</>;

  return (
    <div className="group/tip relative">
      {children}
      {/* Ponte invisível */}
      <div className="pointer-events-none absolute left-0 right-0 bottom-full h-3 group-hover/tip:pointer-events-auto" />
      <div className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-50 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover/tip:pointer-events-auto group-hover/tip:opacity-100">
        <div className="w-64 rounded-lg bg-slate-800 px-3.5 py-3 text-xs text-white shadow-xl">
          {/* Seta para baixo */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />

          {/* Datas e dias */}
          <div className="space-y-0.5">
            {inicio && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Início:</span>
                <span className="font-medium">{inicio}</span>
              </div>
            )}
            {fim && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Conclusão:</span>
                <span className="font-medium">{fim}</span>
              </div>
            )}
            {dias != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Duração:</span>
                <span className="font-medium">{dias} dia{dias !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Lista de observações do artefato */}
          {comentarios.length > 0 && (
            <>
              <div className="my-2 border-t border-slate-600/60" />
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <MessageSquare size={10} />
                Observações ({comentarios.length})
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pr-1">
                <div className="flex flex-col gap-2">
                  {comentarios.map((c) => (
                    <div
                      key={c.id}
                      className="border-b border-slate-700 pb-2 last:border-0 last:pb-0"
                    >
                      <p className="text-xs text-slate-300 leading-snug">{c.conteudo}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(c.criado_em).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {c.autor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Pill de artefato (pipeline) — SEM dias ────────────────────────────── */

function ArtefatoPill({
  artefato,
  onClick,
}: {
  artefato: ArtefatoResumo;
  onClick?: () => void;
}) {
  const label = ARTEFATO_SHORT[artefato.tipo] ?? artefato.tipo;
  const base = "cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 active:scale-95";

  if (artefato.status === "Concluído") {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 hover:ring-emerald-400 ${base}`}
      >
        <Check size={9} strokeWidth={3} />
        {label}
        {artefato.total_comentarios > 0 && <MessageSquare size={8} className="ml-0.5 opacity-50" />}
      </button>
    );
  }

  if (artefato.status === "Iniciado") {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 ring-1 ring-blue-300/50 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-700/50 hover:ring-blue-400 ${base}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        {label}
        {artefato.total_comentarios > 0 && <MessageSquare size={8} className="ml-0.5 opacity-50" />}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500 hover:ring-slate-300 ${base}`}
    >
      {label}
    </button>
  );
}

/* ── Seta separadora ───────────────────────────────────────────────────── */

function PipelineArrow() {
  return <ChevronRight size={10} className="shrink-0 text-slate-300 dark:text-slate-600" />;
}

/* ── Pipeline de artefatos ─────────────────────────────────────────────── */

function ArtefatoPipeline({
  artefatos,
  onArtefatoClick,
}: {
  artefatos: ArtefatoResumo[];
  onArtefatoClick?: (a: ArtefatoResumo) => void;
}) {
  if (!artefatos || artefatos.length === 0) {
    return <span className="text-[10px] text-slate-400 italic">Sem artefatos</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {artefatos.map((a, i) => (
        <div key={a.tipo} className="flex items-center gap-1">
          {i > 0 && <PipelineArrow />}
          <ArtefatoTooltip artefato={a}>
            <ArtefatoPill artefato={a} onClick={() => onArtefatoClick?.(a)} />
          </ArtefatoTooltip>
        </div>
      ))}
    </div>
  );
}

/* ── Tooltip de status com tramitações ─────────────────────────────────── */

const LICITACAO_STATUSES: StatusProjeto[] = ["Em licitação", "Licitação concluída"];

function StatusTooltip({
  projeto,
  children,
}: {
  projeto: ProjetoListagem;
  children: React.ReactNode;
}) {
  const isLicitacao = LICITACAO_STATUSES.includes(projeto.status);
  if (!isLicitacao) return <>{children}</>;

  const envio = fmtDate(projeto.data_envio_licitacao);
  const tramitacoes = projeto.tramitacoes_resumo ?? [];

  if (!envio && tramitacoes.length === 0) return <>{children}</>;

  return (
    <div className="group/status relative">
      {children}
      {/* Ponte invisível entre o pill e o popover */}
      <div className="pointer-events-none absolute left-0 right-0 top-full h-3 group-hover/status:pointer-events-auto" />
      <div className="pointer-events-none absolute top-[calc(100%+12px)] left-1/2 z-50 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover/status:pointer-events-auto group-hover/status:opacity-100">
        <div className="w-72 rounded-lg bg-slate-800 px-3.5 py-3 text-xs text-white shadow-xl">
          {/* Seta */}
          <div className="absolute left-1/2 bottom-full -translate-x-1/2 border-4 border-transparent border-b-slate-800" />

          {/* Data de envio */}
          {envio && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Data de envio:</span>
              <span className="font-semibold text-emerald-400">{envio}</span>
            </div>
          )}

          {/* Tramitações (todas) */}
          {tramitacoes.length > 0 && (
            <>
              {envio && <div className="my-2 border-t border-slate-600/60" />}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Observações:
              </div>
              <div className="space-y-1.5">
                {tramitacoes.map((t) => (
                  <div key={t.id}>
                    <p className="text-slate-200 leading-snug">{t.observacao}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {new Date(t.data_hora).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {t.autor}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Componente ProjetoRow ─────────────────────────────────────────────── */
/* Ordem: PROJETO | ESTEIRA | STATUS | PRIORIDADE | AÇÕES (Editar)         */

interface ProjetoRowProps {
  projeto: ProjetoListagem;
  onVerDetalhes?: (id: number) => void;
  onEditProjeto?: (projeto: ProjetoListagem) => void;
  onArtefatoClick?: (projetoId: number, artefato: ArtefatoResumo) => void;
}

export function ProjetoRow({
  projeto,
  onVerDetalhes,
  onEditProjeto,
  onArtefatoClick,
}: ProjetoRowProps) {
  const prioridade = PRIORIDADE_CONFIG[projeto.prioridade] ?? PRIORIDADE_CONFIG["media"];
  const complexidade = COMPLEXIDADE_CONFIG[projeto.complexidade] ?? COMPLEXIDADE_CONFIG["Simples"];

  return (
    <tr className="group border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/30">
      {/* PROJETO */}
      <td className="px-4 py-3.5 align-top">
        <button
          onClick={() => onVerDetalhes?.(projeto.id)}
          className="text-left text-[13px] font-semibold text-foreground leading-snug line-clamp-2 cursor-pointer hover:text-indigo-600 hover:underline transition-colors dark:hover:text-indigo-400"
        >
          {projeto.nome}
        </button>
        <button
          onClick={() => onVerDetalhes?.(projeto.id)}
          className="mt-1 block text-[11px] font-mono text-slate-400 dark:text-slate-500 cursor-pointer hover:text-indigo-500 transition-colors"
        >
          {projeto.processo_sei}
        </button>
      </td>

      {/* ESTEIRA DE ARTEFATOS */}
      <td className="px-4 py-3.5 align-middle">
        <ArtefatoPipeline
          artefatos={projeto.artefatos_resumo}
          onArtefatoClick={(a) => onArtefatoClick?.(projeto.id, a)}
        />
      </td>

      {/* STATUS DO PROJETO */}
      <td className="px-4 py-3.5 align-middle">
        <StatusTooltip projeto={projeto}>
          <div className="flex items-center justify-center lg:justify-start">
            <span
              className={`inline-block border rounded-full py-0.5 px-2.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${STATUS_PILL[projeto.status]}`}
            >
              {projeto.status}
            </span>
          </div>
        </StatusTooltip>
      </td>

      {/* PRIORIDADE */}
      <td className="px-4 py-3.5 align-middle">
        <div className="flex items-center justify-center">
          <span
            className={`inline-block rounded-full py-0.5 px-2.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${prioridade.cls}`}
          >
            {prioridade.label}
          </span>
        </div>
      </td>

      {/* COMPLEXIDADE */}
      <td className="px-4 py-3.5 align-middle">
        <div className="flex items-center justify-center">
          <span
            className={`inline-block rounded-full py-0.5 px-2.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${complexidade.cls}`}
          >
            {complexidade.label}
          </span>
        </div>
      </td>

      {/* AÇÕES — Apenas Editar */}
      <td className="px-4 py-3.5 align-middle text-center">
        <button
          onClick={() => onEditProjeto?.(projeto)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
          title="Editar projeto"
        >
          <Pencil size={14} />
        </button>
      </td>
    </tr>
  );
}
