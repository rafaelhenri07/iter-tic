"use client";

import Link from "next/link";
import {
  FileText,
  Users,
  ChevronRight,
  LinkIcon,
  ClipboardList,
  Layers,
  Shield,
  BarChart3,
} from "lucide-react";
import type { ProjetoListagem } from "@/types/projeto";
import {
  COMPLEXIDADE_CONFIG,
  STATUS_PROJETO_CONFIG,
} from "@/types/projeto";

interface ProjetoCardProps {
  projeto: ProjetoListagem;
}

export function ProjetoCard({ projeto }: ProjetoCardProps) {
  const complexidade = COMPLEXIDADE_CONFIG[projeto.complexidade];
  const statusCfg = STATUS_PROJETO_CONFIG[projeto.status];

  const progressPct =
    projeto.qtd_artefatos_total > 0
      ? Math.round(
          (projeto.qtd_artefatos_concluidos / projeto.qtd_artefatos_total) * 100
        )
      : 0;

  const temPdtic = projeto.qtd_acoes_pdtic > 0;
  const temPacc = projeto.qtd_itens_pacc > 0;

  return (
    <div className="group relative rounded-2xl border border-border bg-background-card shadow-sm transition-all duration-200 hover:shadow-lg hover:border-brand-primary/30">
      {/* Barra de cor lateral (complexidade) */}
      <div
        className={`absolute left-0 top-0 h-full w-1.5 rounded-l-2xl ${
          projeto.complexidade === "Complexa"
            ? "bg-rose-500"
            : projeto.complexidade === "Intermediária"
              ? "bg-amber-500"
              : "bg-emerald-500"
        }`}
      />

      <div className="pl-5 pr-5 py-5">
        {/* Header: Badges + SEI */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            {/* Nome */}
            <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-brand-primary transition-colors">
              {projeto.nome}
            </h3>
            {/* Processo SEI */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground-muted">
              <FileText size={12} className="shrink-0" />
              <span className="font-mono">{projeto.processo_sei}</span>
            </div>
          </div>

          {/* Badges lado direito */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusCfg.cls}`}
            >
              {statusCfg.icon} {projeto.status}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${complexidade.cls}`}
            >
              <Shield size={10} />
              {complexidade.label}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground-muted flex items-center gap-1">
              <BarChart3 size={11} />
              Artefatos
            </span>
            <span className="font-bold text-foreground">
              {projeto.qtd_artefatos_concluidos}/{projeto.qtd_artefatos_total}{" "}
              <span className="font-normal text-foreground-muted">
                ({progressPct}%)
              </span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct === 100
                  ? "bg-emerald-500"
                  : progressPct >= 50
                    ? "bg-amber-400"
                    : progressPct > 0
                      ? "bg-blue-400"
                      : "bg-gray-300 dark:bg-gray-600"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Footer: Equipe + Vínculos + Ação */}
        <div className="flex items-end justify-between gap-3">
          {/* Equipe */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted mb-1.5">
              <Users size={10} />
              Equipe
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase text-foreground-muted tracking-wider">
                  Requisitante
                </div>
                <div className="truncate font-medium text-foreground">
                  {projeto.nome_requisitante ?? (
                    <span className="text-foreground-muted italic">—</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase text-foreground-muted tracking-wider">
                  Técnico
                </div>
                <div className="truncate font-medium text-foreground">
                  {projeto.nome_tecnico ?? (
                    <span className="text-foreground-muted italic">—</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase text-foreground-muted tracking-wider">
                  Administrativo
                </div>
                <div className="truncate font-medium text-foreground">
                  {projeto.nome_administrativo ?? (
                    <span className="text-foreground-muted italic">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vínculos + Botão */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Indicadores PDTIC/PACC */}
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  temPdtic
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                }`}
                title={
                  temPdtic
                    ? `${projeto.qtd_acoes_pdtic} ação(ões) PDTIC vinculada(s)`
                    : "Sem vínculos PDTIC"
                }
              >
                <Layers size={10} />
                PDTIC {temPdtic ? `(${projeto.qtd_acoes_pdtic})` : ""}
              </span>
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  temPacc
                    ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                }`}
                title={
                  temPacc
                    ? `${projeto.qtd_itens_pacc} item(ns) PACC vinculado(s)`
                    : "Sem vínculos PACC"
                }
              >
                <ClipboardList size={10} />
                PACC {temPacc ? `(${projeto.qtd_itens_pacc})` : ""}
              </span>
            </div>

            {/* Botão Gerenciar */}
            <Link
              href={`/projetos/${projeto.id}`}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 px-3.5 text-[11px] font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30"
            >
              Gerenciar Artefatos
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
