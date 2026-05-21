"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Hash, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function EsqueciSenhaPage() {
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(`${API_BASE}/auth/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula }),
      });
    } catch {
      // Silenciar erros de rede — UX de segurança
    } finally {
      // Sempre exibir sucesso (anti-enumeração)
      setLoading(false);
      setEnviado(true);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      {/* Gradient Background Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <KeyRound size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Recuperar Senha
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Informe sua matrícula para receber o link de redefinição
            </p>
          </div>

          {!enviado ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Matrícula */}
              <div>
                <label
                  htmlFor="recuperar-matricula"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Matrícula
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="recuperar-matricula"
                    name="matricula"
                    type="text"
                    autoComplete="username"
                    required
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    disabled={loading}
                    placeholder="Ex: 123.456-7"
                    className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !matricula.trim()}
                className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Enviar link de recuperação"
                )}
              </button>
            </form>
          ) : (
            /* Sucesso — mensagem genérica anti-enumeração */
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <CheckCircle2 size={32} className="text-emerald-400" />
                <p className="text-center text-sm leading-relaxed text-slate-300">
                  Se a matrícula informada estiver cadastrada, um link de
                  recuperação será enviado para o <strong className="text-white">e-mail institucional</strong> vinculado.
                </p>
              </div>

              <p className="text-center text-xs text-slate-500">
                O link expira em 24 horas. Verifique também a caixa de spam.
              </p>
            </div>
          )}

          {/* Voltar ao login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-indigo-400"
            >
              <ArrowLeft size={12} />
              Voltar ao login
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 border-t border-white/5 pt-5 text-center">
            <p className="text-[11px] text-slate-600">
              Polícia Civil do Distrito Federal — DTI
            </p>
            <p className="mt-0.5 text-[10px] text-slate-700">
              Sistema protegido por autenticação JWT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
