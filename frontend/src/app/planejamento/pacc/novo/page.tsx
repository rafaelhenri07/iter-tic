"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import type { PaccRevisao, PaccExercicio } from "@/types/pacc";
import type { PdticAcao } from "@/types/pdtic";
import {
  itemPaccCreateSchema,
  type ItemPaccCreateFormData,
  cleanItemPaccPayload,
} from "@/lib/validations/pacc";
import { 
  criarItemPacc, 
  fetchAcoesPdticAtivas, 
  fetchPeriodos, 
  fetchExercicios, 
  fetchPainelPacc 
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

export default function NovoItemPaccPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialExercicioId = searchParams.get("exercicioId");

  const [submitting, setSubmitting] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  
  // Dados de contexto
  const [exercicios, setExercicios] = useState<PaccExercicio[]>([]);
  const [revisoes, setRevisoes] = useState<PaccRevisao[]>([]);
  const [acoesPdtic, setAcoesPdtic] = useState<PdticAcao[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(true);
  const [seiList, setSeiList] = useState<string[]>([""]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ItemPaccCreateFormData>({
    resolver: zodResolver(itemPaccCreateSchema),
    defaultValues: {
      exercicio_id: initialExercicioId ? Number(initialExercicioId) : 0,
      revisao_inclusao_id: undefined,
      acao_pdtic_id: 0,
      numero_item: "",
      descricao_demanda: "",
      quantidade: "",
      valor_estimado: 0,
      processo_sei: "",
    },
  });

  const exercicioId = watch("exercicio_id");

  // Fetch ações PDTIC ativas de todos os períodos
  useEffect(() => {
    async function loadAcoes() {
      try {
        const periodosData = await fetchPeriodos();
        const allAcoes: PdticAcao[] = [];
        for (const p of periodosData) {
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

  // Carregar exercícios na montagem
  useEffect(() => {
    async function loadExercicios() {
      try {
        const data = await fetchExercicios();
        setExercicios(data);
        if (data.length > 0 && !exercicioId) {
          const ativo = data.find((e) => e.ativo) ?? data[0];
          setValue("exercicio_id", ativo.id);
        }
      } catch (err) {
        showToast("error", "Erro ao carregar exercícios.");
      }
    }
    loadExercicios();
  }, [exercicioId, setValue]);

  // Quando o exercicioId mudar, carregar as revisões
  useEffect(() => {
    async function loadRevisoes() {
      if (!exercicioId) return;
      setLoadingContext(true);
      try {
        const painel = await fetchPainelPacc(exercicioId, undefined, "todas");
        setRevisoes(painel.revisoes);
        
        if (painel.revisoes.length > 0) {
          setValue("revisao_inclusao_id", painel.revisoes[0].id);
        }
      } catch (err) {
        showToast("error", "Erro ao carregar dados do exercício.");
      } finally {
        setLoadingContext(false);
      }
    }
    
    if (exercicios.length > 0) {
      loadRevisoes();
    }
  }, [exercicioId, exercicios, setValue]);

  // Sincronizar campo SEI
  useEffect(() => {
    const joined = seiList.map((s) => s.trim()).filter(Boolean).join("\n");
    setValue("processo_sei", joined);
  }, [seiList, setValue]);

  const onSubmit = async (data: ItemPaccCreateFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanItemPaccPayload(data);
      await criarItemPacc(payload);
      showToast("success", "Item PACC criado com sucesso!");
      router.push("/planejamento/pacc");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar item.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          href="/planejamento/pacc"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
        >
          <ChevronLeft size={16} />
          Voltar para PACC
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Novo Item do PACC</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Preencha os dados abaixo para cadastrar um novo item no Plano Anual de Contratações.
        </p>
      </div>

      {loadingContext ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
          
          {/* ── Seção: Contexto ─────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-blue-500">
              Contexto da Inclusão
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Exercício PACC" error={errors.exercicio_id?.message} required>
                <select {...register("exercicio_id", { valueAsNumber: true })} className={selectCls} disabled={submitting}>
                  <option value={0}>Selecione um exercício...</option>
                  {exercicios.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.ano}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Inclusão na Revisão" error={errors.revisao_inclusao_id?.message} required>
                <select {...register("revisao_inclusao_id", { valueAsNumber: true })} className={selectCls} disabled={submitting || revisoes.length === 0}>
                  {revisoes.length === 0 && <option value="">Nenhuma revisão disponível</option>}
                  {revisoes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numero_revisao === 0 ? "Aprovação Inicial" : (r.descricao || `Revisão ${r.numero_revisao}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* ── Seção: Vínculo e Demanda ────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-blue-500">
              Vínculo e Demanda
            </h3>
            <div className="space-y-6">
              <FormField label="Ação PDTIC Vinculada" required error={errors.acao_pdtic_id?.message}>
                <select {...register("acao_pdtic_id", { valueAsNumber: true })} className={selectCls} disabled={submitting || loadingAcoes}>
                  <option value={0}>
                    {loadingAcoes ? "Carregando ações..." : "Selecione uma ação PDTIC..."}
                  </option>
                  {acoesPdtic.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo_acao} — {a.descricao.substring(0, 80)}{a.descricao.length > 80 ? "…" : ""}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Descrição da Demanda" required error={errors.descricao_demanda?.message}>
                <textarea
                  {...register("descricao_demanda")}
                  rows={3}
                  placeholder="Descreva a demanda de contratação..."
                  className={`${inputCls} h-auto py-3 resize-none`}
                  disabled={submitting}
                />
              </FormField>
            </div>
          </div>

          {/* ── Seção: Detalhamento ─────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-blue-500">
              Detalhamento do Item
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Número do Item" required error={errors.numero_item?.message}>
                <input {...register("numero_item")} placeholder="Ex: 1, 2, 3..." className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Quantidade" required error={errors.quantidade?.message}>
                <input {...register("quantidade")} placeholder='Ex: 1, 200, "diversos"' className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Valor Estimado (R$)" required error={errors.valor_estimado?.message}>
                <Controller
                  control={control}
                  name="valor_estimado"
                  render={({ field }) => (
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="0,00"
                      className={inputCls}
                      disabled={submitting}
                    />
                  )}
                />
              </FormField>

              <FormField label="Processos SEI" error={errors.processo_sei?.message}>
                <div className="space-y-3">
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
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setSeiList(seiList.filter((_, i) => i !== idx))}
                        className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 transition-colors"
                        title="Remover processo SEI"
                        disabled={submitting}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSeiList([...seiList, ""])}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    disabled={submitting}
                  >
                    <Plus size={14} />
                    Adicionar outro processo SEI
                  </button>
                </div>
              </FormField>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6 mt-12 dark:border-slate-800">
            <Link
              href="/planejamento/pacc"
              className="px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar Item
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
