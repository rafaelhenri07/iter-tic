"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, ChevronLeft, Briefcase } from "lucide-react";
import Link from "next/link";

import { fetchFornecedor, atualizarFornecedor, fetchCatalogo } from "@/lib/api";
import type { CatalogoProduto } from "@/types/catalogo";
import { fornecedorCreateSchema, type FornecedorFormData, cleanFornecedorPayload } from "@/lib/validations/fornecedor";
import { formatPhone, formatCpfCnpj } from "@/lib/formatters";
import { showToast } from "@/components/ui/Toast";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import { FormField, inputCls } from "@/components/ui/FormField";

export default function EditarFornecedorPage() {
  const router = useRouter();
  const params = useParams();
  const fornecedorId = Number(params.id);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [catalogoItems, setCatalogoItems] = useState<CatalogoProduto[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorCreateSchema) as any,
    defaultValues: {
      nome: "",
      natureza: "PESSOA_JURIDICA",
      documento: "",
      site: "",
      email: "",
      contatos: [],
      portfolio_ids: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "contatos" });
  const natureza = watch("natureza");
  const portfolioIds = watch("portfolio_ids");

  useEffect(() => {
    Promise.all([
      fetchFornecedor(fornecedorId),
      fetchCatalogo(),
    ]).then(([f, cat]) => {
      setCatalogoItems(cat);
      reset({
        nome: f.nome,
        natureza: f.natureza,
        documento: f.documento || "",
        site: f.site || "",
        email: f.email || "",
        telefone: f.telefone || "",
        contatos: (f.contatos || []).map((c) => ({
          nome: c.nome,
          telefone: c.telefone || "",
          email: c.email || "",
          cargo: c.cargo || "",
        })),
        portfolio_ids: f.portfolio.map((p) => p.id),
      });
    }).catch(() => {
      showToast("error", "Erro ao carregar fornecedor.");
    }).finally(() => {
      setCarregando(false);
    });
  }, [fornecedorId, reset]);

  const onSubmit = async (data: FornecedorFormData) => {
    setEnviando(true);
    try {
      await atualizarFornecedor(fornecedorId, cleanFornecedorPayload(data));
      showToast("success", "Fornecedor atualizado com sucesso!");
      router.push("/fornecedores");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao atualizar.");
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 px-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/fornecedores"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft size={16} />
          Voltar para Fornecedores
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Editar Fornecedor
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Preencha as informações para atualizar os dados do fornecedor na base do sistema.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <div className="rounded-xl border border-border bg-background-card p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mt-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
            Dados do Fornecedor
          </h3>

          <FormField label="Natureza" required>
            <div className="flex gap-2">
              {(["PESSOA_JURIDICA", "PESSOA_FISICA"] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValue("natureza", n)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    natureza === n
                      ? "border-brand-primary bg-brand-primary/5 text-brand-primary dark:bg-brand-primary/5 dark:text-brand-primary dark:border-brand-primary"
                      : "border-border text-foreground-muted hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {n === "PESSOA_JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física"}
                </button>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Nome / Razão Social" required error={errors.nome?.message}>
                <input {...register("nome")} className={inputCls} />
              </FormField>
            </div>
            <div>
              <FormField label={natureza === "PESSOA_JURIDICA" ? "CNPJ" : "CPF"} required error={errors.documento?.message}>
                <input 
                  {...register("documento", {
                    onChange: (e) => {
                      e.target.value = formatCpfCnpj(e.target.value, natureza === "PESSOA_JURIDICA");
                    }
                  })} 
                  placeholder={natureza === "PESSOA_JURIDICA" ? "00.000.000/0000-00" : "000.000.000-00"} 
                  className={inputCls} 
                />
              </FormField>
            </div>
            <div>
              <FormField label="Telefone" error={errors.telefone?.message}>
                <input 
                  {...register("telefone", {
                    onChange: (e) => {
                      e.target.value = formatPhone(e.target.value);
                    }
                  })} 
                  placeholder="(00) 00000-0000" 
                  className={inputCls} 
                />
              </FormField>
            </div>
            <div>
              <FormField label="Site" error={errors.site?.message}>
                <input {...register("site")} placeholder="https://..." className={inputCls} />
              </FormField>
            </div>
            <div>
              <FormField label="E-mail" error={errors.email?.message}>
                <input {...register("email")} type="email" placeholder="contato@..." className={inputCls} />
              </FormField>
            </div>
          </div>
        </div>

        {/* Contatos */}
        <div className="rounded-xl border border-border bg-background-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mt-2 mb-6">
            <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider">
              Contatos
            </h3>
            <button type="button" onClick={() => append({ nome: "", telefone: "", email: "", cargo: "" })} className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:opacity-80 transition-colors uppercase tracking-wider">
              <Plus size={14} /> Adicionar Contato
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-4">Nenhum contato.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="relative rounded-lg border border-border/60 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <button type="button" onClick={() => remove(index)} className="absolute top-3 right-3 rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                    <Trash2 size={15} />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <FormField label="Nome" required>
                      <input {...register(`contatos.${index}.nome`)} className={inputCls} />
                    </FormField>
                    <FormField label="Cargo">
                      <input {...register(`contatos.${index}.cargo`)} className={inputCls} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <FormField label="Telefone">
                      <input 
                        {...register(`contatos.${index}.telefone`, {
                          onChange: (e) => {
                            e.target.value = formatPhone(e.target.value);
                          }
                        })} 
                        className={inputCls} 
                      />
                    </FormField>
                    <FormField label="E-mail">
                      <input {...register(`contatos.${index}.email`)} className={inputCls} />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Portfólio */}
        <div className="rounded-xl border border-border bg-background-card p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mt-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
            Portfólio (Catálogo)
          </h3>
          {catalogoItems.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-4">Nenhum item no catálogo.</p>
          ) : (
            <MultiSelectCombobox
              placeholder="Selecione os produtos/serviços que este fornecedor oferece..."
              options={catalogoItems
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((item) => ({
                  value: item.id,
                  label: item.nome,
                }))}
              value={portfolioIds || []}
              onChange={(newVal) => setValue("portfolio_ids", newVal as number[])}
            />
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 mt-12 dark:border-slate-800">
          <Link href="/fornecedores" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground-muted hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={enviando}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg disabled:opacity-50"
          >
            {enviando && <Loader2 size={14} className="animate-spin" />}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
