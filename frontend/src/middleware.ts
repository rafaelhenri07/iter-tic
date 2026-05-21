import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * ITER TIC - Middleware de Proteção de Rotas
 *
 * Intercepta todas as requisições e redireciona para /login
 * caso o cookie de autenticação não esteja presente.
 *
 * Rotas públicas (login, arquivos estáticos, api) são liberadas.
 */

// Rotas que NÃO exigem autenticação
const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/ativar-conta", "/redefinir-senha"];

// Prefixos que devem ser ignorados pelo middleware
const IGNORED_PREFIXES = [
  "/_next",      // Assets internos do Next.js
  "/api",        // API routes (se houver)
  "/favicon",    // Favicon
];

// Extensões de arquivos estáticos
const STATIC_EXTENSIONS = [
  ".ico", ".png", ".jpg", ".jpeg", ".svg", ".gif",
  ".webp", ".css", ".js", ".woff", ".woff2", ".ttf",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora prefixos internos do Next.js e API
  if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Ignora arquivos estáticos
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  // Permite acesso às rotas públicas
  if (PUBLIC_PATHS.includes(pathname)) {
    // Se já está logado e tenta acessar /login, redireciona para home
    const token = request.cookies.get("itertic_token")?.value;
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Verifica a presença do token de autenticação
  const token = request.cookies.get("itertic_token")?.value;

  if (!token) {
    // Redireciona para login, preservando a URL de destino
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Controle de Acesso (RBAC) para rotas administrativas
  const ADMIN_PATHS = ["/admin", "/configuracoes", "/equipe"];
  if (ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    const userCookie = request.cookies.get("itertic_user")?.value;
    let userRole = "";
    
    if (userCookie) {
      try {
        const decoded = decodeURIComponent(userCookie);
        const parsed = JSON.parse(decoded);
        userRole = parsed.role || parsed.nivel_acesso;
      } catch (e) {
        console.error("Erro ao decodificar cookie de usuario no middleware", e);
      }
    }
    
    if (userRole !== "ADMIN") {
      const redirectUrl = new URL("/dashboard", request.url);
      redirectUrl.searchParams.set("auth_error", "Acesso negado. Privilégios insuficientes.");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

// Configura o matcher para interceptar todas as rotas relevantes
export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas EXCETO:
     * - _next/static (arquivos estáticos do Next.js)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone do site)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
