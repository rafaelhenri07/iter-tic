"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/**
 * Wrapper de tema (next-themes) que utiliza a estratégia de classe (.dark)
 * integrada ao @custom-variant do Tailwind v4.
 *
 * `attribute="class"` → adiciona/remove a classe `dark` no <html>
 * `defaultTheme="system"` → respeita preferência do OS ao iniciar
 * `enableSystem` → mantém sincronização com mudanças do OS
 */
export function ThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
