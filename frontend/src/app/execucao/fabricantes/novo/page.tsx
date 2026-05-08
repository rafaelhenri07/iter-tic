"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Loader2, Save, Building2, User } from "lucide-react";

import { FormField, inputCls } from "@/components/ui/FormField";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import { criarFabricante } from "@/lib/api";

const fabricanteSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório (mín. 2 caracteres)"),
  site: z.string().optional(),
  contato_nome: z.string().optional(),
  contato_cargo: z.string().optional(),
  contato_telefone1: z.string().optional(),
  contato_telefone2: z.string().optional(),
  contato_email: z.union([z.literal(""), z.string().email("E-mail inválido")]).optional(),
});

type FabricanteFormData = z.infer<typeof fabricanteSchema>;

export default function NovoFabricantePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FabricanteFormData>({
    resolver: zodResolver(fabricanteSchema),
    defaultValues: {
      nome: "",
      site: "",
      contato_nome: "",
      contato_cargo: "",
      contato_telefone1: "",
      contato_telefone2: "",
      contato_email: "",
    },
  });

  const onSubmit = async (data: FabricanteFormData) => {
    setSubmitting(true);
    try {
      await criarFabricante({
        nome: data.nome,
        site: data.site || undefined,
        contato_nome: data.contato_nome || "",
        contato_cargo: data.contato_cargo || "",
        contato_telefone1: data.contato_telefone1 || "",
        contato_telefone2: data.contato_telefone2 || undefined,
        contato_email: data.contato_email || "",
      });
      showToast("success", "Fabricante cadastrado com sucesso!");
      setTimeout(() => {
        router.push("/execucao/fabricantes");
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar fabricante:", error);
      showToast("error", "Erro ao cadastrar fabricante. Tente novamente.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <ToastContainer />

      {/* Header Fixo */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <Link
            href="/execucao/fabricantes"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Novo Fabricante
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cadastro de fornecedores de soluções de TI
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          {/* Seção 1: Dados da Empresa */}
          <section>
            <h3 className="mb-6 mt-10 flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-slate-800 dark:border-slate-700 dark:text-slate-200">
              <Building2 size={16} className="text-indigo-500" />
              Dados da Empresa
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Nome do Fabricante" required error={errors.nome?.message} className="sm:col-span-2">
                <input
                  {...register("nome")}
                  placeholder="Ex: Microsoft Informática Ltda"
                  className={inputCls}
                />
              </FormField>
              
              <FormField label="Site" error={errors.site?.message} className="sm:col-span-2">
                <input
                  {...register("site")}
                  placeholder="https://www.exemplo.com.br"
                  className={inputCls}
                />
              </FormField>
            </div>
          </section>

          {/* Seção 2: Contato Principal */}
          <section>
            <h3 className="mb-6 mt-10 flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-slate-800 dark:border-slate-700 dark:text-slate-200">
              <User size={16} className="text-indigo-500" />
              Contato Principal
            </h3>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Nome do Contato" error={errors.contato_nome?.message}>
                <input
                  {...register("contato_nome")}
                  placeholder="Nome completo"
                  className={inputCls}
                />
              </FormField>
              
              <FormField label="Cargo" error={errors.contato_cargo?.message}>
                <input
                  {...register("contato_cargo")}
                  placeholder="Ex: Gerente Comercial"
                  className={inputCls}
                />
              </FormField>
              
              <FormField label="Telefone 1" error={errors.contato_telefone1?.message}>
                <input
                  {...register("contato_telefone1")}
                  placeholder="(61) 99999-0000"
                  className={inputCls}
                />
              </FormField>
              
              <FormField label="Telefone 2" error={errors.contato_telefone2?.message}>
                <input
                  {...register("contato_telefone2")}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </FormField>
              
              <FormField label="E-mail" error={errors.contato_email?.message} className="sm:col-span-2">
                <input
                  type="email"
                  {...register("contato_email")}
                  placeholder="contato@fabricante.com.br"
                  className={inputCls}
                />
              </FormField>
            </div>
          </section>

          {/* Rodapé de Ações */}
          <div className="mt-12 flex justify-end gap-4 border-t border-slate-200 pt-6 dark:border-slate-700">
            <Link
              href="/execucao/fabricantes"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
