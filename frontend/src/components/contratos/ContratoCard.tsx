"use client";

import {
  FileSignature,
  Building2,
  Calendar,
  DollarSign,
  Hash,
  FolderKanban,
  FileText,
  User,
  Eye,
  Pencil,
} from "lucide-react";
import type { ContratoListagem } from "@/types/contrato";
import {
  TIPO_CONTRATO_CONFIG,
  SITUACAO_CONTRATO_CONFIG,
  MODALIDADE_CONTRATO_CONFIG,
} from "@/types/contrato";
import { formatarMoedaBRL, formatDate } from "@/lib/formatters";

interface ContratoCardProps {
  contrato: ContratoListagem;
  onVerDetalhes?: (id: number) => void;
  onEditar?: (id: number) => void;
}

export function ContratoCard({ contrato, onVerDetalhes, onEditar }: ContratoCardProps) {
  const tipoCfg = TIPO_CONTRATO_CONFIG[contrato.tipo_contrato];
  const sitCfg = SITUACAO_CONTRATO_CONFIG[contrato.situacao_atual];
  const modCfg = MODALIDADE_CONTRATO_CONFIG[contrato.modalidade_contrato] ?? MODALIDADE_CONTRATO_CONFIG.CONTRATO;
  const isARP = contrato.modalidade_contrato === 'ARP';

  return (
    <div className="group rounded-xl border border-border bg-background-card shadow-sm transition-all hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20">
            <FileSignature size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                {isARP ? 'ARP' : 'Contrato'} {String(contrato.numero).padStart(3, '0')}/{contrato.ano}
              </h3>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${modCfg.cls}`}>
                {modCfg.icon} {modCfg.label}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
              <Building2 size={11} />
              <span className="truncate">{contrato.empresa_nome ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sitCfg.cls}`}
          >
            {sitCfg.icon} {contrato.situacao_atual}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tipoCfg.cls}`}
          >
            {tipoCfg.icon} {contrato.tipo_contrato}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Financeiro */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
              Valor Total
            </div>
            <div className="mt-0.5 text-sm font-extrabold text-foreground font-mono">
              {formatarMoedaBRL(contrato.valor_total)}
            </div>
          </div>
        </div>

        {/* Vigência */}
        <div className="flex items-center gap-4 text-xs text-foreground-muted">
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <span>
              {formatDate(contrato.data_assinatura)} → {formatDate(contrato.data_fim_vigencia)}
            </span>
          </div>
        </div>

        {/* Vínculo com projeto */}
        {contrato.projeto_nome && (
          <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="text-[9px] font-bold uppercase tracking-widest text-violet-500 mb-1">
              Projeto de Origem
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <FolderKanban size={11} className="text-violet-500 shrink-0" />
              <span className="font-medium text-violet-800 dark:text-violet-300 truncate">
                {contrato.projeto_nome}
              </span>
            </div>
            {contrato.projeto_processo_sei && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-600/70 dark:text-violet-400/60 mt-0.5">
                <FileText size={10} className="shrink-0" />
                <span className="font-mono">{contrato.projeto_processo_sei}</span>
              </div>
            )}
          </div>
        )}

        {/* Gestor + Botão de detalhes */}
        <div className="flex items-center justify-between pt-1">
          {contrato.nome_gestor ? (
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <User size={11} />
              <span>
                Gestor: <strong className="text-foreground">{contrato.nome_gestor}</strong>
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onEditar && (
              <button
                onClick={() => onEditar(contrato.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5
                           text-xs font-semibold text-amber-700 transition-all
                           hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm
                           dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400
                           dark:hover:bg-amber-900/40 dark:hover:border-amber-700"
              >
                <Pencil size={13} />
                Editar
              </button>
            )}
            {onVerDetalhes && (
              <button
                onClick={() => onVerDetalhes(contrato.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5
                           text-xs font-semibold text-cyan-700 transition-all
                           hover:bg-cyan-100 hover:border-cyan-300 hover:shadow-sm
                           dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-400
                           dark:hover:bg-cyan-900/40 dark:hover:border-cyan-700"
              >
                <Eye size={13} />
                Ver detalhes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
