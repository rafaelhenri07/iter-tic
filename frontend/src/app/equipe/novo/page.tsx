"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  Loader2,
  Save,
  Hash,
  User,
  Briefcase,
  Building,
  Shield,
  X,
} from "lucide-react";

import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import {
  servidorSchema,
  type ServidorFormData,
  cleanServidorPayload,
} from "@/lib/validations/servidor";
import { criarServidor } from "@/lib/api";
import { showToast, ToastContainer } from "@/components/ui/Toast";

export default function NovoServidorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServidorFormData>({
    resolver: zodResolver(servidorSchema),
    defaultValues: {
      matricula: "",
      nome: "",
      cargo: "",
      funcao: "",
      lotacao: "",
      perfil_acesso: "",
    },
  });

  const onSubmit = async (data: ServidorFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanServidorPayload(data);
      await criarServidor(payload);
      showToast("success", `Servidor "${data.nome}" cadastrado com sucesso!`);
      setTimeout(() => {
        router.push("/equipe");
      }, 1500);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao salvar servidor."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8">
        <Link
          href="/equipe"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft size={16} />
          Voltar para Equipe
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          Novo Servidor
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Preencha os dados abaixo para cadastrar um novo integrante na equipe.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* DADOS PESSOAIS */}
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:text-slate-300 dark:border-slate-800">
          Dados Pessoais
        </h3>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Nome Completo"
            required
            icon={<User size={14} />}
            error={errors.nome?.message}
          >
            <input
              {...register("nome")}
              placeholder="Nome completo do servidor"
              className={inputCls}
            />
          </FormField>
          
          <FormField
            label="Matrícula"
            required
            icon={<Hash size={14} />}
            error={errors.matricula?.message}
          >
            <input
              {...register("matricula")}
              placeholder="Ex: 12345"
              className={inputCls}
            />
          </FormField>
        </div>

        {/* DADOS FUNCIONAIS */}
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:text-slate-300 dark:border-slate-800">
          Dados Funcionais
        </h3>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Lotação"
            required
            icon={<Building size={14} />}
            error={errors.lotacao?.message}
          >
            <input
              {...register("lotacao")}
              placeholder="Ex: DTI, Gabinete"
              className={inputCls}
            />
          </FormField>

          <FormField
            label="Perfil de Acesso"
            icon={<Shield size={14} />}
            error={errors.perfil_acesso?.message}
          >
            <select {...register("perfil_acesso")} className={selectCls}>
              <option value="">Selecione...</option>
              <option value="Administrador">🔴 Administrador</option>
              <option value="Gestor">🔵 Gestor</option>
              <option value="Visualizador">🟢 Visualizador</option>
            </select>
          </FormField>

          <FormField
            label="Cargo"
            required
            icon={<Briefcase size={14} />}
            error={errors.cargo?.message}
          >
            <input
              {...register("cargo")}
              placeholder="Ex: Analista de TI"
              className={inputCls}
            />
          </FormField>

          <FormField
            label="Função (opcional)"
            icon={<Briefcase size={14} />}
            error={errors.funcao?.message}
          >
            <input
              {...register("funcao")}
              placeholder="Ex: Chefe de Seção"
              className={inputCls}
            />
          </FormField>
        </div>

        {/* AÇÕES */}
        <div className="flex justify-end gap-4 mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => router.push("/equipe")}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Servidor
              </>
            )}
          </button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}
