"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Plus,
  Loader2,
  UserPlus,
  Hash,
  User,
  Briefcase,
  Building,
  Shield,
  Save,
} from "lucide-react";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import {
  servidorSchema,
  type ServidorFormData,
  cleanServidorPayload,
} from "@/lib/validations/servidor";
import { criarServidor, atualizarServidor } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { Servidor } from "@/types/projeto";

/* ── Componente ────────────────────────────────────────────────────────── */

interface ServidorModalProps {
  servidor?: Servidor | null; // null = criação, objeto = edição
  onClose: () => void;
  onSuccess: () => void;
}

export function ServidorModal({
  servidor,
  onClose,
  onSuccess,
}: ServidorModalProps) {
  const isEditing = !!servidor;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServidorFormData>({
    resolver: zodResolver(servidorSchema),
    defaultValues: {
      matricula: servidor?.matricula ?? "",
      nome: servidor?.nome ?? "",
      cargo: servidor?.cargo ?? "",
      funcao: servidor?.funcao ?? "",
      lotacao: servidor?.lotacao ?? "",
      perfil_acesso:
        (servidor?.perfil_acesso as "Administrador" | "Gestor" | "Visualizador") ?? "",
    },
  });

  const onSubmit = async (data: ServidorFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanServidorPayload(data);
      if (isEditing) {
        await atualizarServidor(servidor.id, payload);
        showToast("success", `Servidor "${data.nome}" atualizado com sucesso!`);
      } else {
        await criarServidor(payload);
        showToast("success", `Servidor "${data.nome}" cadastrado com sucesso!`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao salvar servidor."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-12"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? "Editar Servidor" : "Novo Servidor"}
              </h2>
              <p className="text-xs text-foreground-muted">
                {isEditing
                  ? `Editando ${servidor.nome}`
                  : "Cadastro de servidor PCDF"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Matrícula"
              required
              icon={<Hash size={10} />}
              error={errors.matricula?.message}
            >
              <input
                {...register("matricula")}
                placeholder="Ex: 12345"
                className={inputCls}
                disabled={isEditing}
              />
            </FormField>

            <FormField
              label="Lotação"
              required
              icon={<Building size={10} />}
              error={errors.lotacao?.message}
            >
              <input
                {...register("lotacao")}
                placeholder="Ex: DTI, Gabinete"
                className={inputCls}
              />
            </FormField>
          </div>

          <FormField
            label="Nome Completo"
            required
            icon={<User size={10} />}
            error={errors.nome?.message}
          >
            <input
              {...register("nome")}
              placeholder="Nome completo do servidor"
              className={inputCls}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Cargo"
              required
              icon={<Briefcase size={10} />}
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
              icon={<Briefcase size={10} />}
              error={errors.funcao?.message}
            >
              <input
                {...register("funcao")}
                placeholder="Ex: Chefe de Seção"
                className={inputCls}
              />
            </FormField>
          </div>

          <FormField
            label="Perfil de Acesso"
            icon={<Shield size={10} />}
            error={errors.perfil_acesso?.message}
          >
            <select {...register("perfil_acesso")} className={selectCls}>
              <option value="">Selecione...</option>
              <option value="Administrador">🔴 Administrador</option>
              <option value="Gestor">🔵 Gestor</option>
              <option value="Visualizador">🟢 Visualizador</option>
            </select>
          </FormField>

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
              disabled={submitting}
              className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                <>
                  <Save size={14} />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Cadastrar Servidor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
