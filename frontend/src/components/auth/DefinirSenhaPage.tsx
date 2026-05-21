"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Regras de senha ──────────────────────────────────────────────────────
interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "Mínimo 8 caracteres", test: (pw) => pw.length >= 8 },
  { label: "Pelo menos 1 letra", test: (pw) => /[a-zA-Z]/.test(pw) },
  { label: "Pelo menos 1 número", test: (pw) => /[0-9]/.test(pw) },
  { label: "Pelo menos 1 caractere especial", test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

// ── Props ────────────────────────────────────────────────────────────────
interface DefinirSenhaPageProps {
  titulo: string;
  subtitulo: string;
  icon: "shield" | "key";
  successMessage: string;
}

// ── Formulário (precisa de Suspense por usar useSearchParams) ─────────
function DefinirSenhaForm({ titulo, subtitulo, icon, successMessage }: DefinirSenhaPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Validação de regras em tempo real
  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(novaSenha) })),
    [novaSenha]
  );

  const allRulesPassed = ruleResults.every((r) => r.passed);
  const senhasConferem = novaSenha === confirmarSenha && confirmarSenha.length > 0;
  const canSubmit = allRulesPassed && senhasConferem && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/definir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nova_senha: novaSenha }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // Extrair mensagem de validação Pydantic se disponível
        const detail = body?.detail;
        if (Array.isArray(detail)) {
          throw new Error(detail[0]?.msg || "Erro ao definir senha.");
        }
        throw new Error(typeof detail === "string" ? detail : "Erro ao definir senha.");
      }

      setSucesso(true);
      // Redirecionar para login após 3 segundos
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao definir senha.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Token ausente
  if (!token) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-center text-sm text-slate-300">
            Link inválido ou expirado. Solicite um novo link de recuperação.
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/esqueci-senha"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-indigo-400"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  // Sucesso
  if (sucesso) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <CheckCircle2 size={32} className="text-emerald-400" />
          <p className="text-center text-sm leading-relaxed text-slate-300">
            {successMessage}
          </p>
        </div>
        <p className="text-center text-xs text-slate-500">
          Redirecionando para o login...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nova Senha */}
        <div>
          <label
            htmlFor="nova-senha"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Nova Senha
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="nova-senha"
              name="nova-senha"
              type={showNova ? "text" : "password"}
              autoComplete="new-password"
              required
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowNova(!showNova)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
              tabIndex={-1}
            >
              {showNova ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Checklist de Regras */}
        {novaSenha.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            {ruleResults.map((rule, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                  rule.passed ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {rule.passed ? (
                  <Check size={13} className="shrink-0" />
                ) : (
                  <X size={13} className="shrink-0" />
                )}
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirmar Senha */}
        <div>
          <label
            htmlFor="confirmar-senha"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Confirmar Senha
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="confirmar-senha"
              name="confirmar-senha"
              type={showConfirmar ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className={`block w-full rounded-xl border bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:bg-white/[0.07] focus:ring-2 disabled:opacity-50 ${
                confirmarSenha.length > 0
                  ? senhasConferem
                    ? "border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    : "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20"
                  : "border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmar(!showConfirmar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
              tabIndex={-1}
            >
              {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmarSenha.length > 0 && !senhasConferem && (
            <p className="mt-1.5 text-xs text-red-400">As senhas não coincidem.</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Definir senha"
          )}
        </button>
      </form>
    </>
  );
}

// ── Shell da Página ──────────────────────────────────────────────────────
export default function DefinirSenhaPage(props: DefinirSenhaPageProps) {
  const IconComponent = props.icon === "shield" ? ShieldCheck : KeyRound;

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
              <IconComponent size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {props.titulo}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {props.subtitulo}
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-indigo-500" />
              </div>
            }
          >
            <DefinirSenhaForm {...props} />
          </Suspense>

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
