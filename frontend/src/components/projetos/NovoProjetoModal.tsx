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
      complexidade: "media",
      catmat: "",
      catser: "",
      integrante_requisitante_id: 0,
      integrante_tecnico_id: 0,
      integrante_administrativo_id: 0,
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

                <FormField label="Complexidade" required error={errors.complexidade?.message}>
                  <select {...register("complexidade")} className={selectCls}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="CATMAT (Material)" error={errors.catmat?.message}>
                  <input
                    {...register("catmat")}
                    placeholder="Ex: 4501002"
                    className={inputCls}
                  />
                </FormField>

                <FormField label="CATSER (Serviço)" error={errors.catser?.message}>
                  <input
                    {...register("catser")}
                    placeholder="Ex: 27502"
                    className={inputCls}
                  />
                </FormField>
              </div>
            </div>

            {/* ═══ 2. EQUIPE ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide dark:text-indigo-400">
                2. Equipe
              </h3>

              <FormField label="Integrante Requisitante">
                <select
                  {...register("integrante_requisitante_id", { valueAsNumber: true })}
                  className={selectCls}
                  disabled={loadingServidores}
                >
                  <option value={0}>
                    {loadingServidores ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Integrante Técnico">
                <select
                  {...register("integrante_tecnico_id", { valueAsNumber: true })}
                  className={selectCls}
                  disabled={loadingServidores}
                >
                  <option value={0}>
                    {loadingServidores ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Integrante Administrativo">
                <select
                  {...register("integrante_administrativo_id", { valueAsNumber: true })}
                  className={selectCls}
                  disabled={loadingServidores}
                >
                  <option value={0}>
                    {loadingServidores ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>
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
                  <select
                    className={selectCls}
                    disabled={loadingAcoes}
                    value=""
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id && !selectedAcoes.includes(id)) {
                        setValue("acoes_pdtic_ids", [...selectedAcoes, id]);
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">
                      {loadingAcoes ? "Carregando..." : "Adicionar ação..."}
                    </option>
                    {acoesPdtic
                      .filter((a) => !selectedAcoes.includes(a.id))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo_acao} — {a.descricao}
                        </option>
                      ))}
                  </select>
                  {selectedAcoes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedAcoes.map((id) => {
                        const acao = acoesPdtic.find((a) => a.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          >
                            {acao?.codigo_acao ?? id}
                            <button
                              type="button"
                              onClick={() => setValue("acoes_pdtic_ids", selectedAcoes.filter((x) => x !== id))}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PACC */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Itens PACC
                  </label>
                  <select
                    className={selectCls}
                    disabled={loadingItens}
                    value=""
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id && !selectedItens.includes(id)) {
                        setValue("itens_pacc_ids", [...selectedItens, id]);
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">
                      {loadingItens ? "Carregando..." : "Adicionar item..."}
                    </option>
                    {itensPacc
                      .filter((i) => !selectedItens.includes(i.id))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.numero_item} — {item.descricao_demanda}
                        </option>
                      ))}
                  </select>
                  {selectedItens.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedItens.map((id) => {
                        const item = itensPacc.find((i) => i.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                          >
                            #{item?.numero_item ?? id}
                            <button
                              type="button"
                              onClick={() => setValue("itens_pacc_ids", selectedItens.filter((x) => x !== id))}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
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
