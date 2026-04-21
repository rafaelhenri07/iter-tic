"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Pencil,
  Plus,
  Trash2,
  Loader2,
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
  const [seiList, setSeiList] = useState<string[]>(
    item.processo_sei ? item.processo_sei.split("\n") : [""]
  );

  // Revisões filtradas: incluir a revisão de inclusão (pode editar na mesma) e posteriores
  const revisaoInclusao = revisoes.find((r) => r.id === item.revisao_inclusao_id);
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.numero_revisao >= (revisaoInclusao?.numero_revisao ?? 0)
  );

  const {
    register,
    handleSubmit,
    setValue,
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
    const joined = seiList.map((s) => s.trim()).filter(Boolean).join("\n");
    setValue("processo_sei", joined);
  }, [seiList, setValue]);

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
          <h2 className="text-lg font-bold text-foreground">
            Editar Item {item.numero_item}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Revisão da Alteração */}
        <div className="mx-6 mt-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Em qual revisão essa alteração foi feita? <span className="text-red-500">*</span>
          </label>
          <select
            value={revisaoAlteracaoId}
            onChange={(e) => setRevisaoAlteracaoId(Number(e.target.value))}
            className={selectCls}
          >
            <option value={0}>Selecione a revisão...</option>
            {revisoesDisponiveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.numero_revisao === 0
                  ? "Aprovação Inicial"
                  : r.descricao || `Revisão ${r.numero_revisao}`}
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
            error={errors.acao_pdtic_id?.message}
          >
            <select
              {...register("acao_pdtic_id", { valueAsNumber: true })}
              className={selectCls}
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
              label="Processos SEI"
              error={errors.processo_sei?.message}
            >
              <div className="space-y-2">
                {seiList.map((sei, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={sei}
                      onChange={(e) => {
                        const newList = [...seiList];
                        newList[idx] = e.target.value;
                        setSeiList(newList);
                      }}
                      placeholder="Ex: 00052-00032300/2024-09"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setSeiList(seiList.filter((_, i) => i !== idx))}
                      className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 transition-colors"
                      title="Remover processo SEI"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSeiList([...seiList, ""])}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Plus size={14} />
                  Adicionar outro processo SEI
                </button>
              </div>
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
