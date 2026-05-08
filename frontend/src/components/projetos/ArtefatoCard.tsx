"use client";

import { useState } from "react";
import {
  Pencil,
  AlertTriangle
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Artefato } from "@/types/projeto";
import { GerenciarArtefatoModal } from "@/components/projetos/GerenciarArtefatoModal";

/* ── Ícone por tipo ────────────────────────────────────────────────────── */

const TIPO_ICONS: Record<string, { emoji: string; color: string }> = {
  DFD: { emoji: "📋", color: "from-blue-500 to-blue-600" },
  ETP: { emoji: "📊", color: "from-indigo-500 to-indigo-600" },
  "Mapa de Riscos": { emoji: "🛡️", color: "from-rose-500 to-rose-600" },
  "Estimativa de Custos e Orçamento": { emoji: "💰", color: "from-emerald-500 to-emerald-600" },
  TR: { emoji: "📝", color: "from-violet-500 to-violet-600" },
};

/* ── Helper de data ─────────────────────────────────────────────────────── */

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const parsed = parseISO(d);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

/* ── Helper: está atrasado? ────────────────────────────────────────────── */

function isAtrasado(artefato: Artefato): boolean {
  if (!artefato.data_fim_prevista) return false;
  const prazo = parseISO(artefato.data_fim_prevista);
  if (!isValid(prazo)) return false;
  if (artefato.status === "Concluído" && artefato.data_conclusao) {
    const conclusao = parseISO(artefato.data_conclusao);
    return isValid(conclusao) && conclusao > prazo;
  }
  if (artefato.status === "Iniciado") {
    return new Date() > prazo;
  }
  return false;
}

/* ── Props ─────────────────────────────────────────────────────────────── */

interface ArtefatoCardProps {
  artefato: Artefato;
  onRefresh: () => void;
}

export function ArtefatoCard({ artefato, onRefresh }: ArtefatoCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  
  const icon = TIPO_ICONS[artefato.tipo] ?? { emoji: "📄", color: "from-gray-500 to-gray-600" };
  const atrasado = isAtrasado(artefato);

  return (
    <>
      <div className="flex flex-col border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50 transition-colors py-4 px-6 dark:bg-transparent dark:border-slate-800/50 dark:hover:bg-slate-900/50">
        
        {/* ── GRID PRINCIPAL (1fr | auto | auto) ── */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-8 items-center">
          
          {/* COLUNA 1: IDENTIFICAÇÃO */}
          <div className="flex items-center gap-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${icon.color} text-white text-sm shadow-sm shrink-0`}>
              {icon.emoji}
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={artefato.tipo}>
              {artefato.tipo}
            </h3>
          </div>

          {/* COLUNA 2: DATAS (Mini-Tabela Invisível) */}
          <div className="flex space-x-6 text-sm text-slate-600 dark:text-slate-400">
            <div>
              <span className="text-slate-400 dark:text-slate-500 text-xs block mb-0.5">Início</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{fmtDate(artefato.data_inicio)}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 text-xs block mb-0.5">Prazo Limite</span>
              <span className={`font-medium ${atrasado ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                {fmtDate(artefato.data_fim_prevista)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 text-xs block mb-0.5">Fim</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{fmtDate(artefato.data_conclusao)}</span>
            </div>
          </div>

          {/* COLUNA 3: STATUS / AÇÕES */}
          <div className="flex items-center gap-4">
            {atrasado && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                <AlertTriangle size={12} />
                ATRASADO
              </span>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="text-slate-400 hover:text-indigo-600 transition-colors dark:hover:text-indigo-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Editar Artefato"
            >
              <Pencil size={15} />
            </button>
          </div>
          
        </div>

        {/* ── SUB-LINHA: JUSTIFICATIVA (Alinhada com o nome) ── */}
        {artefato.justificativa_atraso && (
          <div className="mt-2 pl-[48px] text-sm text-slate-500 dark:text-slate-400 italic">
            Justificativa: {artefato.justificativa_atraso}
          </div>
        )}
      </div>

      {modalOpen && (
        <GerenciarArtefatoModal
          projetoId={artefato.projeto_id}
          artefato={artefato as any}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
