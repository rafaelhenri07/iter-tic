"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, X, Plus, FolderKanban } from "lucide-react";
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
import { ToastContainer } from "@/components/ui/Toast";
import type { Servidor } from "@/types/projeto";
import type { PdticAcao } from "@/types/pdtic";
import type { PaccItemComAcao } from "@/types/pacc";

/* ── Estilos base ───────────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

const selectCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/* ── Label + Erro ───────────────────────────────────────────────────────── */

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Título de Seção ────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-10 mb-6 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:border-slate-700 dark:text-indigo-400">
      {children}
    </h3>
  );
}

/* ── Página Principal ──────────────────────────────────────────────────── */

export default function NovoProjetoPage() {
  const router = useRouter();
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
      prioridade: "media",
      complexidade: "Simples",
      integrante_requisitante_id: 0,
      integrante_tecnico_id: 0,
      integrante_administrativo_id: 0,
      acoes_pdtic_ids: [],
      itens_pacc_ids: [],
    },
  });

  const selectedAcoes = watch("acoes_pdtic_ids") ?? [];
  const selectedItens = watch("itens_pacc_ids") ?? [];

  // Load dados
  useEffect(() => {
    (async () => {
      try {
        setServidores(await fetchServidores());
      } catch {
        setServidores([]);
      } finally {
        setLoadingServidores(false);
      }
    })();

    (async () => {
      try {
        const periodos = await fetchPeriodos();
        const all: PdticAcao[] = [];
        for (const p of periodos) all.push(...(await fetchAcoesPdticAtivas(p.id)));
        setAcoesPdtic(all);
      } catch {
        setAcoesPdtic([]);
      } finally {
        setLoadingAcoes(false);
      }
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
      } catch {
        setItensPacc([]);
      } finally {
        setLoadingItens(false);
      }
    })();
  }, []);

  const onSubmit = async (data: ProjetoCreateFormData) => {
    setSubmitting(true);
    try {
      setSubmitPhase("Criando projeto...");
      const payload = cleanProjetoPayload(data);
      const novoProjeto = await criarProjeto(payload);

      setSubmitPhase("Inicializando artefatos...");
      await inicializarArtefatos(novoProjeto.id);

      showToast("success", `Projeto "${data.nome}" criado com sucesso!`);
      router.push("/projetos");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar projeto.");
      setSubmitting(false);
      setSubmitPhase("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* ── Botão Voltar ── */}
        <button
          type="button"
          onClick={() => router.push("/projetos")}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          Voltar para Projetos
        </button>

        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-md shadow-violet-500/20">
            <FolderKanban size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Novo Projeto</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Preencha as informações para a fase interna da contratação de TI
            </p>
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ══ 1. DADOS BÁSICOS ══ */}
          <SectionTitle>Dados Básicos</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nome do Projeto" required error={errors.nome?.message}>
              <input
                {...register("nome")}
                placeholder="Ex: Aquisição de Switches Core para o Datacenter"
                className={inputCls}
                autoFocus
              />
            </Field>

            <Field label="Processo SEI" required error={errors.processo_sei?.message}>
              <input
                {...register("processo_sei")}
                placeholder="00052-00032300/2024-09"
                className={inputCls}
              />
            </Field>

            <Field label="Prioridade" required error={errors.prioridade?.message}>
              <select {...register("prioridade")} className={selectCls}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </Field>

            <Field label="Complexidade" required error={errors.complexidade?.message}>
              <select {...register("complexidade")} className={selectCls}>
                <option value="Simples">Simples</option>
                <option value="Intermediária">Intermediária</option>
                <option value="Complexa">Complexa</option>
              </select>
            </Field>
          </div>

          {/* ══ 2. EQUIPE ══ */}
          <SectionTitle>Equipe de Planejamento</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-1">
            <Field label="Integrante Requisitante">
              <select
                {...register("integrante_requisitante_id", { valueAsNumber: true })}
                className={selectCls}
                disabled={loadingServidores}
              >
                <option value={0}>{loadingServidores ? "Carregando..." : "Selecione..."}</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} — {s.cargo}</option>
                ))}
              </select>
            </Field>

            <Field label="Integrante Técnico">
              <select
                {...register("integrante_tecnico_id", { valueAsNumber: true })}
                className={selectCls}
                disabled={loadingServidores}
              >
                <option value={0}>{loadingServidores ? "Carregando..." : "Selecione..."}</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} — {s.cargo}</option>
                ))}
              </select>
            </Field>

            <Field label="Integrante Administrativo">
              <select
                {...register("integrante_administrativo_id", { valueAsNumber: true })}
                className={selectCls}
                disabled={loadingServidores}
              >
                <option value={0}>{loadingServidores ? "Carregando..." : "Selecione..."}</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} — {s.cargo}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ══ 3. PLANEJAMENTO ESTRATÉGICO ══ */}
          <SectionTitle>Planejamento Estratégico</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* PDTIC */}
            <Field label="Ações PDTIC">
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
                <option value="">{loadingAcoes ? "Carregando..." : "Adicionar ação..."}</option>
                {acoesPdtic
                  .filter((a) => !selectedAcoes.includes(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo_acao} — {a.descricao}
                    </option>
                  ))}
              </select>
              {selectedAcoes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAcoes.map((id) => {
                    const acao = acoesPdtic.find((a) => a.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50"
                      >
                        {acao?.codigo_acao ?? id}
                        <button
                          type="button"
                          onClick={() => setValue("acoes_pdtic_ids", selectedAcoes.filter((x) => x !== id))}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* PACC */}
            <Field label="Itens PACC">
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
                <option value="">{loadingItens ? "Carregando..." : "Adicionar item..."}</option>
                {itensPacc
                  .filter((i) => !selectedItens.includes(i.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.numero_item} — {item.descricao_demanda}
                    </option>
                  ))}
              </select>
              {selectedItens.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItens.map((id) => {
                    const item = itensPacc.find((i) => i.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 border border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50"
                      >
                        #{item?.numero_item ?? id}
                        <button
                          type="button"
                          onClick={() => setValue("itens_pacc_ids", selectedItens.filter((x) => x !== id))}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Field>
          </div>

          {/* ══ AÇÕES ══ */}
          <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              Campos com <span className="text-red-500">*</span> são obrigatórios
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/projetos")}
                className="h-10 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 px-6 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:brightness-110 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
}
