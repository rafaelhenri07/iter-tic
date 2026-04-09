"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Pencil,
  Loader2,
  Hash,
  FileText,
  DollarSign,
  Package,
  Link2,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import {
  itemPaccUpdateSchema,
  type ItemPaccUpdateFormData,
  cleanItemPaccPayload,
} from "@/lib/validations/pacc";
import {
  atualizarItemPacc,
  fetchAcoesPdticAtivas,
  fetchPeriodos,
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { PaccRevisao, PaccItem, PaccItemComAcao } from "@/types/pacc";
import type { PdticAcao } from "@/types/pdtic";

type AnyPaccItem = PaccItemComAcao | PaccItem;

interface EditarItemPaccModalProps {
  item: AnyPaccItem;
  revisoes: PaccRevisao[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditarItemPaccModal({
  item,
  revisoes,
  onClose,
  onSuccess,
}: EditarItemPaccModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [revisaoAlteracaoId, setRevisaoAlteracaoId] = useState<number>(0);
  const [acoesPdtic, setAcoesPdtic] = useState<PdticAcao[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(true);

  // Revisões filtradas: excluir a revisão de inclusão original
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.id !== item.revisao_inclusao_id
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemPaccUpdateFormData>({
    resolver: zodResolver(itemPaccUpdateSchema),
    defaultValues: {
      numero_item: item.numero_item,
      descricao_demanda: item.descricao_demanda,
      quantidade: item.quantidade,
      valor_estimado: item.valor_estimado,
      processo_sei: item.processo_sei ?? "",
      acao_pdtic_id: item.acao_pdtic_id,
    },
  });

  // Fetch ações PDTIC ativas
  useEffect(() => {
    async function loadAcoes() {
      try {
        const periodos = await fetchPeriodos();
        const allAcoes: PdticAcao[] = [];
        for (const p of periodos) {
          const acoes = await fetchAcoesPdticAtivas(p.id);
          allAcoes.push(...acoes);
        }
        setAcoesPdtic(allAcoes);
      } catch {
        setAcoesPdtic([]);
      } finally {
        setLoadingAcoes(false);
      }
    }
    loadAcoes();
  }, []);

  const onSubmit = async (data: ItemPaccUpdateFormData) => {
    if (!revisaoAlteracaoId) {
      showToast("error", "Selecione a Revisão da Alteração.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = cleanItemPaccPayload(data);
      await atualizarItemPacc(item.id, revisaoAlteracaoId, payload);
      showToast("success", "Item PACC atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao atualizar item."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 text-white">
              <Pencil size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Editar Item #{item.numero_item}
              </h2>
              <p className="text-xs text-foreground-muted">
                Edição SCD — cria nova versão vinculada
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

        {/* SCD Warning — Revisão da Alteração */}
        <div className="mx-6 mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle size={14} />
            Revisão da Alteração (Obrigatório)
          </div>
          <p className="mb-3 text-xs text-amber-600 dark:text-amber-400/80">
            A versão atual será fechada e uma nova versão será criada com
            os dados editados, vinculada a esta revisão.
          </p>
          <select
            value={revisaoAlteracaoId}
            onChange={(e) => setRevisaoAlteracaoId(Number(e.target.value))}
            className={`${selectCls} border-amber-400 bg-white dark:border-amber-700 dark:bg-amber-950/50`}
          >
            <option value={0}>Selecione a revisão...</option>
            {revisoesDisponiveis.map((r) => (
              <option key={r.id} value={r.id}>
                Rev {r.numero_revisao}
                {r.data_aprovacao
                  ? ` (${new Date(r.data_aprovacao + "T00:00:00").toLocaleDateString("pt-BR")})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
          {/* PDTIC Link */}
          <FormField
            label="Ação PDTIC Vinculada"
            required
            icon={<Link2 size={10} />}
            error={errors.acao_pdtic_id?.message}
          >
            <select
              {...register("acao_pdtic_id", { valueAsNumber: true })}
              className={`${selectCls} border-indigo-300 dark:border-indigo-700`}
            >
              <option value={0}>
                {loadingAcoes
                  ? "Carregando ações..."
                  : "Selecione uma ação PDTIC..."}
              </option>
              {acoesPdtic.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo_acao} — {a.descricao.substring(0, 60)}
                  {a.descricao.length > 60 ? "…" : ""}
                </option>
              ))}
            </select>
          </FormField>

          {/* Número + Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Número do Item"
              required
              icon={<Hash size={10} />}
              error={errors.numero_item?.message}
            >
              <input
                {...register("numero_item")}
                className={inputCls}
              />
            </FormField>

            <FormField
              label="Quantidade"
              required
              icon={<Package size={10} />}
              error={errors.quantidade?.message}
            >
              <input
                {...register("quantidade")}
                className={inputCls}
              />
            </FormField>
          </div>

          {/* Descrição */}
          <FormField
            label="Descrição da Demanda"
            required
            icon={<FileText size={10} />}
            error={errors.descricao_demanda?.message}
          >
            <textarea
              {...register("descricao_demanda")}
              rows={3}
              className={`${inputCls} h-auto py-2`}
            />
          </FormField>

          {/* Valor + SEI */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Valor Estimado (R$)"
              required
              icon={<DollarSign size={10} />}
              error={errors.valor_estimado?.message}
            >
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("valor_estimado", { valueAsNumber: true })}
                className={inputCls}
              />
            </FormField>

            <FormField
              label="Processo SEI"
              icon={<FileText size={10} />}
              error={errors.processo_sei?.message}
            >
              <input
                {...register("processo_sei")}
                placeholder="00052-00032300/2024-09"
                className={inputCls}
              />
            </FormField>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !revisaoAlteracaoId}
              className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 px-5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Pencil size={14} />
              )}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
