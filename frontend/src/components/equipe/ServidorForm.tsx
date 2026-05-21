"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Save,
  Hash,
  User,
  Briefcase,
  Building,
  Mail,
  X,
} from "lucide-react";

import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import {
  servidorSchema,
  type ServidorFormData,
} from "@/lib/validations/servidor";
import { fetchUnidadesOrganizacionais } from "@/lib/api";
import type { UnidadeOrg } from "@/types/estrutura_organizacional";
import { showToast } from "@/components/ui/Toast";

/* ── Props ──────────────────────────────────────────────────────────────── */

interface ServidorFormProps {
  /** Dados iniciais para preencher o formulário no modo de edição. */
  initialData?: {
    matricula: string;
    nome: string;
    cargo: string;
    funcao?: string | null;
    lotacao_id: number;
    email_funcional?: string | null;
  };
  /** Callback chamado ao submeter com dados válidos. */
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  /** Rótulo do botão de submit. */
  submitLabel?: string;
  /** Se true, exibe spinner no botão de submit. */
  submitting?: boolean;
  /** Callback do botão "Cancelar". */
  onCancel: () => void;
}

/* ── Componente ─────────────────────────────────────────────────────────── */

export default function ServidorForm({
  initialData,
  onSubmit,
  submitLabel = "Salvar Servidor",
  submitting = false,
  onCancel,
}: ServidorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServidorFormData>({
    resolver: zodResolver(servidorSchema),
    defaultValues: {
      matricula: initialData?.matricula ?? "",
      nome: initialData?.nome ?? "",
      cargo: initialData?.cargo ?? "",
      funcao: initialData?.funcao ?? "",
      lotacao_id: initialData?.lotacao_id ?? 0,
      email_funcional: initialData?.email_funcional ?? "",
    },
  });

  const [unidades, setUnidades] = useState<UnidadeOrg[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchUnidadesOrganizacionais();
        setUnidades(data);
      } catch {
        showToast("error", "Erro ao carregar unidades organizacionais.");
      }
    }
    load();
  }, []);

  const handleFormSubmit = async (data: ServidorFormData) => {
    const clean: Record<string, unknown> = { ...data };
    if (clean.funcao === "") clean.funcao = null;
    await onSubmit(clean);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      {/* DADOS PESSOAIS */}
      <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800">
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
      <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800">
        Dados Funcionais
      </h3>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="Lotação"
          required
          icon={<Building size={14} />}
          error={errors.lotacao_id?.message}
        >
          <select
            {...register("lotacao_id", { valueAsNumber: true })}
            className={selectCls}
          >
            <option value="">Selecione a Lotação</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.caminho_completo}
              </option>
            ))}
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

        <FormField
          label="E-mail Funcional"
          required
          icon={<Mail size={14} />}
          error={errors.email_funcional?.message}
        >
          <input
            {...register("email_funcional")}
            type="email"
            placeholder="Ex: servidor@orgao.gov.br"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* AÇÕES */}
      <div className="flex justify-end gap-4 mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <X size={16} />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
