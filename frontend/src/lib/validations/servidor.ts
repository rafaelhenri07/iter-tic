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

  lotacao_id: z.number({ error: "Selecione a lotação" }).min(1, "Selecione a lotação."),

  email_funcional: z
    .string({ error: "E-mail funcional é obrigatório." })
    .min(1, "E-mail não pode ser vazio.")
    .email("Formato de e-mail inválido.")
    .max(200, "Máximo de 200 caracteres."),
});

export type ServidorFormData = z.infer<typeof servidorSchema>;

export function cleanServidorPayload(
  data: ServidorFormData
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };
  if (clean.funcao === "") clean.funcao = null;
  return clean;
}
