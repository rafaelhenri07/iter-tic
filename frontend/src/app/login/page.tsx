"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import Cookies from "js-cookie";
import { useConfig } from "@/components/providers/ConfigProvider";
import { showToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { config } = useConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Email ou senha inválidos");
      }

      const data = await res.json();
      
      // Salva o token JWT nos cookies
      Cookies.set("itertic_token", data.access_token, { expires: 7 }); 
      Cookies.set("usuario_nome", data.usuario_nome, { expires: 7 });

      showToast("success", "Login realizado com sucesso!");
      router.push("/");
    } catch (err: any) {
      showToast("error", err.message || "Erro ao realizar login");
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = config?.cor_primaria || "#4f46e5"; // Indigo 600 default

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
            ) : (
              <Lock size={28} className="text-slate-600" />
            )}
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            {config?.nome_orgao || "ITER TIC"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">Acesso Restrito</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="sr-only" htmlFor="email-address">E-mail</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-lg border-0 bg-slate-50 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:outline-none sm:text-sm sm:leading-6"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-lg border-0 bg-slate-50 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:outline-none sm:text-sm sm:leading-6"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg px-3 py-3 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
