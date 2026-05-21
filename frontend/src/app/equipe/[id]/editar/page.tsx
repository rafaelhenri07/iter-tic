"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";

import ServidorForm from "@/components/equipe/ServidorForm";
import { fetchServidor, atualizarServidor } from "@/lib/api";
import type { Servidor } from "@/types/projeto";
import { showToast, ToastContainer } from "@/components/ui/Toast";

/* ── Página de Edição ───────────────────────────────────────────────────── */

export default function EditarServidorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const servidorId = Number(id);

  const router = useRouter();
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchServidor(servidorId);
        setServidor(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar servidor."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [servidorId]);

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await atualizarServidor(servidorId, payload);
      showToast("success", `Servidor "${payload.nome}" atualizado com sucesso!`);
      setTimeout(() => {
        router.push("/equipe");
      }, 1500);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao atualizar servidor."
      );
      setSubmitting(false);
    }
  };

  /* ── Loading State ─────────────────────────────────────────────────────── */

  if (loading) {
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
            Editar Servidor
          </h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </div>
    );
  }

  /* ── Error State ───────────────────────────────────────────────────────── */

  if (error || !servidor) {
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
            Editar Servidor
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertCircle size={36} className="text-red-400" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {error || "Servidor não encontrado."}
          </p>
          <Link
            href="/equipe"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
          >
            <ChevronLeft size={14} />
            Voltar para a listagem
          </Link>
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

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
          Editar Servidor
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Altere os dados de <strong>{servidor.nome}</strong> e salve as
          modificações.
        </p>
      </div>

      <ServidorForm
        initialData={{
          matricula: servidor.matricula,
          nome: servidor.nome,
          cargo: servidor.cargo,
          funcao: servidor.funcao,
          lotacao_id: servidor.lotacao_id,
          email_funcional: servidor.email_funcional,
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Salvar Alterações"
        onCancel={() => router.push("/equipe")}
      />

      <ToastContainer />
    </div>
  );
}
