/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod para Servidor
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";

export const servidorSchema = z.object({
  matricula: z
    .string({ error: "Matrícula é obrigatória." })
    .min(1, "Matrícula não pode ser vazia.")
    .max(30, "Máximo de 30 caracteres."),

  nome: z
    .string({ error: "Nome é obrigatório." })
    .min(1, "Nome não pode ser vazio.")
    .max(200, "Máximo de 200 caracteres."),

  cargo: z
    .string({ error: "Cargo é obrigatório." })
    .min(1, "Cargo não pode ser vazio.")
    .max(200, "Máximo de 200 caracteres."),

  funcao: z
    .string()
    .max(200, "Máximo de 200 caracteres.")
    .optional()
    .or(z.literal("")),

  lotacao: z
    .string({ error: "Lotação é obrigatória." })
    .min(1, "Lotação não pode ser vazia.")
    .max(200, "Máximo de 200 caracteres."),

  perfil_acesso: z
    .enum(["Administrador", "Gestor", "Visualizador"], {
      error: "Selecione o perfil de acesso.",
    })
    .optional()
    .or(z.literal("")),
});

export type ServidorFormData = z.infer<typeof servidorSchema>;

export function cleanServidorPayload(
  data: ServidorFormData
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };
  if (clean.funcao === "") clean.funcao = null;
  if (clean.perfil_acesso === "") clean.perfil_acesso = null;
  return clean;
}
