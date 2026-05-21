"use client";

import { useRouter } from "next/navigation";
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
  "Fase interna": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50",
  "Fase externa": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800/50",
  "Contratado": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50",
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

const FASE_EXTERNA_STATUSES: StatusProjeto[] = ["Fase externa"];

function StatusTooltip({
  projeto,
  children,
}: {
  projeto: ProjetoListagem;
  children: React.ReactNode;
}) {
  const isFaseExterna = FASE_EXTERNA_STATUSES.includes(projeto.status);
  if (!isFaseExterna) return <>{children}</>;

  const envio = fmtDate(projeto.data_envio_licitacao);
  const mov = projeto.ultima_movimentacao;
  const duracao = projeto.duracao_fase_externa_dias;

  if (!envio && !mov && duracao == null) return <>{children}</>;

  return (
    <div className="group/status relative">
      {children}
      {/* Ponte invisível entre o pill e o popover */}
      <div className="pointer-events-none absolute left-0 right-0 top-full h-3 group-hover/status:pointer-events-auto" />
      <div className="pointer-events-none absolute top-[calc(100%+12px)] left-1/2 z-50 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover/status:pointer-events-auto group-hover/status:opacity-100">
        <div className="w-80 rounded-lg bg-slate-800 px-3.5 py-3 text-xs text-white shadow-xl">
          {/* Seta */}
          <div className="absolute left-1/2 bottom-full -translate-x-1/2 border-4 border-transparent border-b-slate-800" />

          {/* 1. Data de envio */}
          {envio && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Data de envio:</span>
              <span className="font-semibold text-emerald-400">{envio}</span>
            </div>
          )}

          {/* 2. Última Movimentação */}
          {mov && (
            <>
              {envio && <div className="my-2 border-t border-slate-600/60" />}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Última Movimentação
              </div>
              <p className="text-slate-200 leading-snug">{mov.texto}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                {new Date(mov.data).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}
                {mov.autor}
              </p>
            </>
          )}

          {/* 3. Duração na Fase Externa */}
          {duracao != null && (
            <>
              {(envio || mov) && <div className="my-2 border-t border-slate-600/60" />}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Duração:</span>
                <span className="font-semibold text-amber-400">
                  {duracao} {duracao === 1 ? "dia" : "dias"}
                </span>
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
  onEditProjeto?: (projeto: ProjetoListagem) => void;
  onArtefatoClick?: (projetoId: number, artefato: ArtefatoResumo) => void;
}

export function ProjetoRow({
  projeto,
  onEditProjeto,
  onArtefatoClick,
}: ProjetoRowProps) {
  const router = useRouter();
  const prioridade = projeto.prioridade ? PRIORIDADE_CONFIG[projeto.prioridade] : null;
  const complexidade = projeto.complexidade ? COMPLEXIDADE_CONFIG[projeto.complexidade] : COMPLEXIDADE_CONFIG["Simples"];

  return (
    <tr
      className="group cursor-pointer border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/30"
      onClick={() => router.push(`/projetos/${projeto.id}`)}
    >
      <td className="px-4 py-3.5 align-top">
        <span className="text-left text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
          {projeto.nome}
        </span>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {projeto.processo_sei}
          </span>
          {projeto.is_legado && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
              📋 Anterior
            </span>
          )}
        </div>
      </td>

      {/* ESTEIRA DE ARTEFATOS — Zona Segura: bloqueia propagação para o <tr> */}
      <td
        className="px-4 py-3.5 align-middle cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {projeto.is_legado ? (
          <span className="text-[10px] text-slate-400 italic">Sem esteira</span>
        ) : (
          <ArtefatoPipeline
            artefatos={projeto.artefatos_resumo}
            onArtefatoClick={(a) => onArtefatoClick?.(projeto.id, a)}
          />
        )}
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
          {prioridade ? (
            <span
              className={`inline-block rounded-full py-0.5 px-2.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${prioridade.cls}`}
            >
              {prioridade.label}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600">—</span>
          )}
        </div>
      </td>



      {/* AÇÕES — Apenas Editar */}
      <td className="px-4 py-3.5 align-middle text-center">
        <button
          onClick={(e) => { e.stopPropagation(); onEditProjeto?.(projeto); }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20 mx-auto"
          title="Editar projeto"
        >
          <Pencil size={15} />
        </button>
      </td>
    </tr>
  );
}
