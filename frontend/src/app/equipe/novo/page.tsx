"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import ServidorForm from "@/components/equipe/ServidorForm";
import { criarServidor } from "@/lib/api";
import { showToast, ToastContainer } from "@/components/ui/Toast";

export default function NovoServidorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await criarServidor(payload);
      showToast("success", `Servidor "${payload.nome}" cadastrado com sucesso!`);
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

      <ServidorForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Salvar Servidor"
        onCancel={() => router.push("/equipe")}
      />

      <ToastContainer />
    </div>
  );
}
