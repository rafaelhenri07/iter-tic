"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Loader2, Plus, X } from "lucide-react";
import { criarEmpresa } from "@/lib/api";
import { showToast, ToastContainer } from "@/components/ui/Toast";

/* ── Estilos base ───────────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

/* ── Field ──────────────────────────────────────────────────────────────── */

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

/* ── SectionTitle ───────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-10 mb-6 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-violet-600 dark:border-slate-700 dark:text-violet-400">
      {children}
    </h3>
  );
}

/* ── TagInput ───────────────────────────────────────────────────────────── */

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="min-h-[42px] w-full flex flex-wrap gap-1.5 items-center rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800"
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Digite e pressione Enter para adicionar (ex: "Fábrica de Software")' : "Adicionar serviço..."}
        className="flex-1 min-w-[180px] bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:text-slate-100"
      />
      {input && (
        <button
          type="button"
          onClick={() => addTag(input)}
          className="flex items-center gap-1 rounded-md bg-violet-500 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-violet-600"
        >
          <Plus size={10} />
          Adicionar
        </button>
      )}
    </div>
  );
}

/* ── Formulário state ───────────────────────────────────────────────────── */

interface FormState {
  nome: string;
  cnpj: string;
  site: string;
  contato_nome: string;
  telefone: string;
  email: string;
  servicos_ofertados: string[];
}

const INITIAL: FormState = {
  nome: "",
  cnpj: "",
  site: "",
  contato_nome: "",
  telefone: "",
  email: "",
  servicos_ofertados: [],
};

/* ── Página Principal ───────────────────────────────────────────────────── */

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof FormState, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "E-mail inválido.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await criarEmpresa({
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim(),
        site: form.site.trim() || null,
        contato_nome: form.contato_nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        servicos_ofertados: form.servicos_ofertados,
      });
      showToast("success", `Empresa "${form.nome}" cadastrada com sucesso!`);
      setTimeout(() => router.push("/empresas"), 1200);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar empresa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">

        {/* ── Botão Voltar ── */}
        <button
          type="button"
          onClick={() => router.push("/empresas")}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          Voltar para Empresas
        </button>

        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Nova Empresa
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Cadastre um novo fornecedor no catálogo de empresas
            </p>
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit}>

          {/* ══ 1. DADOS DA EMPRESA ══ */}
          <SectionTitle>Dados da Empresa</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Razão Social / Nome" required error={errors.nome} className="sm:col-span-2">
              <input
                id="empresa-nome"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Tech Solutions Ltda."
                className={inputCls}
              />
            </Field>

            <Field label="CNPJ" error={errors.cnpj}>
              <input
                id="empresa-cnpj"
                value={form.cnpj}
                onChange={(e) => set("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00"
                className={inputCls}
              />
            </Field>

            <Field label="Site" error={errors.site}>
              <input
                id="empresa-site"
                value={form.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="https://www.empresa.com.br"
                className={inputCls}
              />
            </Field>
          </div>

          {/* ══ 2. CONTATO PRINCIPAL ══ */}
          <SectionTitle>Contato Principal</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nome do Contato" error={errors.contato_nome} className="sm:col-span-2">
              <input
                id="contato-nome"
                value={form.contato_nome}
                onChange={(e) => set("contato_nome", e.target.value)}
                placeholder="Ex: João Silva"
                className={inputCls}
              />
            </Field>

            <Field label="Telefone" error={errors.telefone}>
              <input
                id="contato-telefone"
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(61) 99999-9999"
                className={inputCls}
              />
            </Field>

            <Field label="E-mail" error={errors.email}>
              <input
                id="contato-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contato@empresa.com.br"
                className={inputCls}
              />
            </Field>
          </div>

          {/* ══ 3. PORTFÓLIO ══ */}
          <SectionTitle>Portfólio de Serviços</SectionTitle>
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o nome de um serviço e pressione <kbd className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-700">Enter</kbd> ou{" "}
              <kbd className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-700">,</kbd> para adicionar.
            </p>
            <TagInput
              tags={form.servicos_ofertados}
              onChange={(tags) => set("servicos_ofertados", tags)}
            />
            {form.servicos_ofertados.length > 0 && (
              <p className="text-xs text-slate-400">
                {form.servicos_ofertados.length} serviço(s) adicionado(s)
              </p>
            )}
          </div>

          {/* ══ AÇÕES ══ */}
          <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              Campos com <span className="text-red-500">*</span> são obrigatórios
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/empresas")}
                className="h-10 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-salvar-empresa"
                disabled={submitting}
                className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-6 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:brightness-110 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" />Salvando...</>
                ) : (
                  <><Briefcase size={14} />Cadastrar Empresa</>
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
