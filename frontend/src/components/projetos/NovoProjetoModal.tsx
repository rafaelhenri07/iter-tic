"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Plus, Loader2 } from "lucide-react";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import {
  projetoCreateSchema,
  type ProjetoCreateFormData,
  cleanProjetoPayload,
} from "@/lib/validations/projeto";
import {
  criarProjeto,
  inicializarArtefatos,
  fetchServidores,
  fetchPeriodos,
  fetchAcoesPdticAtivas,
  fetchExercicios,
  fetchPainelPacc,
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import type { Servidor } from "@/types/projeto";
import type { PdticAcao } from "@/types/pdtic";
import type { PaccItemComAcao } from "@/types/pacc";



/* ── Componente ────────────────────────────────────────────────────────── */

interface NovoProjetoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function NovoProjetoModal({ onClose, onSuccess }: NovoProjetoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");

  // Dados dinâmicos – carregados em paralelo
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loadingServidores, setLoadingServidores] = useState(true);

  const [acoesPdtic, setAcoesPdtic] = useState<PdticAcao[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(true);

  const [itensPacc, setItensPacc] = useState<PaccItemComAcao[]>([]);
  const [loadingItens, setLoadingItens] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProjetoCreateFormData>({
    resolver: zodResolver(projetoCreateSchema),
    defaultValues: {
      nome: "",
      processo_sei: "",
      complexidade: "Intermediária",
      integrantes_requisitantes_ids: [],
      integrantes_tecnicos_ids: [],
      integrantes_administrativos_ids: [],
      substitutos_requisitantes_ids: [],
      substitutos_tecnicos_ids: [],
      substitutos_administrativos_ids: [],
      acoes_pdtic_ids: [],
      itens_pacc_ids: [],
    },
  });

  const selectedAcoes = watch("acoes_pdtic_ids") ?? [];
  const selectedItens = watch("itens_pacc_ids") ?? [];

  // ── Load dados dinâmicos (paralelo, sem bloquear) ────────────────────
  useEffect(() => {
    (async () => {
      try { setServidores(await fetchServidores()); }
      catch { setServidores([]); }
      finally { setLoadingServidores(false); }
    })();

    (async () => {
      try {
        const periodos = await fetchPeriodos();
        const all: PdticAcao[] = [];
        for (const p of periodos) all.push(...await fetchAcoesPdticAtivas(p.id));
        setAcoesPdtic(all);
      } catch { setAcoesPdtic([]); }
      finally { setLoadingAcoes(false); }
    })();

    (async () => {
      try {
        const exercicios = await fetchExercicios();
        const all: PaccItemComAcao[] = [];
        for (const ex of exercicios) {
          const painel = await fetchPainelPacc(ex.id);
          all.push(...painel.itens_ativos);
        }
        setItensPacc(all);
      } catch { setItensPacc([]); }
      finally { setLoadingItens(false); }
    })();
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProjetoCreateFormData) => {
    setSubmitting(true);
    try {
      setSubmitPhase("Criando projeto...");
      const payload = cleanProjetoPayload(data);
      const novoProjeto = await criarProjeto(payload);

      setSubmitPhase("Inicializando artefatos...");
      await inicializarArtefatos(novoProjeto.id);

      showToast("success", `Projeto "${data.nome}" criado com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar projeto.");
    } finally {
      setSubmitting(false);
      setSubmitPhase("");
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-6"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* ── Header (limpo, sem subtítulo) ────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-base font-bold text-foreground">Novo Projeto</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Form Body ────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0 max-h-[70vh]">

            {/* ═══ 1. DADOS BÁSICOS ═══ */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide dark:text-indigo-400">
                1. Dados Básicos
              </h3>

              <FormField label="Nome do Projeto" required error={errors.nome?.message}>
                <input
                  {...register("nome")}
                  placeholder="Ex: Aquisição de Switches Core para o Datacenter"
                  className={inputCls}
                  autoFocus
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Processo SEI" required error={errors.processo_sei?.message}>
                  <input
                    {...register("processo_sei")}
                    placeholder="00052-00032300/2024-09"
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Prioridade" required error={errors.prioridade?.message}>
                  <select {...register("prioridade")} className={selectCls}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </FormField>

                <FormField label="Complexidade" required error={errors.complexidade?.message}>
                  <select {...register("complexidade")} className={selectCls}>
                    <option value="Simples">Simples</option>
                    <option value="Intermediária">Intermediária</option>
                    <option value="Complexa">Complexa</option>
                  </select>
                </FormField>
              </div>

            </div>

            {/* ═══ 2. EQUIPE ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide dark:text-indigo-400">
                2. Equipe
              </h3>

              {/* ── Bloco: Integrante Requisitante ── */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 bg-slate-50/30 dark:bg-slate-900/20">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Integrante Requisitante</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Titular(es)">
                    <MultiSelectCombobox
                      options={servidores
                        .filter(s => !watch("substitutos_requisitantes_ids").includes(s.id))
                        .map(s => ({ value: s.id, label: s.nome }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={watch("integrantes_requisitantes_ids")}
                      onChange={(ids) => setValue("integrantes_requisitantes_ids", ids as number[])}
                      placeholder={loadingServidores ? "Carregando..." : "Selecione os titulares..."}
                      disabled={loadingServidores}
                    />
                  </FormField>
                  <FormField label="Substituto(s)">
                    <MultiSelectCombobox
                      options={servidores
                        .filter(s => !watch("integrantes_requisitantes_ids").includes(s.id))
                        .map(s => ({ value: s.id, label: s.nome }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={watch("substitutos_requisitantes_ids")}
                      onChange={(ids) => setValue("substitutos_requisitantes_ids", ids as number[])}
                      placeholder={loadingServidores ? "Carregando..." : "Selecione os substitutos..."}
                      disabled={loadingServidores}
                    />
                  </FormField>
                </div>
              </div>

              {/* ── Bloco: Integrante Técnico ── */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 bg-slate-50/30 dark:bg-slate-900/20">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Integrante Técnico</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Titular(es)">
                    <MultiSelectCombobox
                      options={servidores
                        .filter(s => !watch("substitutos_tecnicos_ids").includes(s.id))
                        .map(s => ({ value: s.id, label: s.nome }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={watch("integrantes_tecnicos_ids")}
                      onChange={(ids) => setValue("integrantes_tecnicos_ids", ids as number[])}
                      placeholder={loadingServidores ? "Carregando..." : "Selecione os titulares..."}
                      disabled={loadingServidores}
                    />
                  </FormField>
                  <FormField label="Substituto(s)">
                    <MultiSelectCombobox
                      options={servidores
                        .filter(s => !watch("integrantes_tecnicos_ids").includes(s.id))
                        .map(s => ({ value: s.id, label: s.nome }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={watch("substitutos_tecnicos_ids")}
                      onChange={(ids) => setValue("substitutos_tecnicos_ids", ids as number[])}
                      placeholder={loadingServidores ? "Carregando..." : "Selecione os substitutos..."}
                      disabled={loadingServidores}
                    />
                  </FormField>
                </div>
              </div>

              {/* ── Bloco: Integrante Administrativo ── */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 bg-slate-50/30 dark:bg-slate-900/20">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Integrante Administrativo</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Titular(es)">
                    <MultiSelectCombobox
                      options={servidores
                        .filter(s => !watch("substitutos_administrativos_ids").includes(s.id))
                        .map(s => ({ value: s.id, label: s.nome }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={watch("integrantes_administrativos_ids")}
                      onChange={(ids) => setValue("integrantes_administrativos_ids", ids as number[])}
                      placeholder={loadingServidores ? "Carregando..." : "Selecione os titulares..."}
                      disabled={loadingServidores}
                    />
                  </FormField>
                  <FormField label="Substituto(s)">
                    <MultiSelectCombobox
                      options={servidores
                        .filter(s => !watch("integrantes_administrativos_ids").includes(s.id))
                        .map(s => ({ value: s.id, label: s.nome }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={watch("substitutos_administrativos_ids")}
                      onChange={(ids) => setValue("substitutos_administrativos_ids", ids as number[])}
                      placeholder={loadingServidores ? "Carregando..." : "Selecione os substitutos..."}
                      disabled={loadingServidores}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* ═══ 3. PLANEJAMENTO ESTRATÉGICO ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide dark:text-indigo-400">
                3. Planejamento Estratégico
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* PDTIC */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Ações PDTIC
                  </label>
                  <MultiSelectCombobox
                    options={acoesPdtic
                      .map(a => ({ value: a.id, label: `${a.codigo_acao} — ${a.descricao}` }))
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    value={selectedAcoes}
                    onChange={(val) => setValue("acoes_pdtic_ids", val as number[])}
                    placeholder={loadingAcoes ? "Carregando..." : "Selecione as ações..."}
                    disabled={loadingAcoes}
                  />
                </div>

                {/* PACC */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Itens PACC
                  </label>
                  <MultiSelectCombobox
                    options={itensPacc
                      .map(i => ({ value: i.id, label: `#${i.numero_item} — ${i.descricao_demanda}` }))
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    value={selectedItens}
                    onChange={(val) => setValue("itens_pacc_ids", val as number[])}
                    placeholder={loadingItens ? "Carregando..." : "Selecione os itens..."}
                    disabled={loadingItens}
                  />
                </div>
              </div>
            </div>

            <div className="h-4" />
          </div>

          {/* ── Sticky Footer ─────────────────────────────────────────── */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 px-5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {submitPhase}
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Criar Projeto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
