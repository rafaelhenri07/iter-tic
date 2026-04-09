/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod para Contrato
 * Espelha as regras do Pydantic no backend (ContratoCreate)
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";

const RE_NUMERO_CONTRATO = /^\d{2,3}\/\d{4}$/;

export const contratoCreateSchema = z
  .object({
    /* Projeto de Origem */
    projeto_id: z
      .number({ error: "Selecione o projeto de origem." })
      .int()
      .min(1, "Selecione um projeto válido."),

    /* Dados da Contratação */
    numero_contrato: z
      .string({ error: "Número do contrato é obrigatório." })
      .min(1, "Número do contrato é obrigatório.")
      .regex(
        RE_NUMERO_CONTRATO,
        "Formato inválido. Use NN/YYYY ou NNN/YYYY (ex: 42/2025)."
      ),

    empresa_contratada: z
      .string({ error: "Empresa é obrigatória." })
      .min(1, "Empresa contratada é obrigatória.")
      .max(500, "Máximo de 500 caracteres."),

    fabricante: z
      .string()
      .max(300, "Máximo de 300 caracteres.")
      .optional()
      .or(z.literal("")),

    tipo_contrato: z.enum(
      ["Aquisição", "Serviço continuado", "Subscrição"],
      { error: "Selecione o tipo de contrato." }
    ),

    quantidade: z
      .number({ error: "Quantidade é obrigatória." })
      .int("Deve ser um número inteiro.")
      .min(1, "Mínimo: 1."),

    tecnologia_utilizada: z
      .string()
      .max(500, "Máximo de 500 caracteres.")
      .optional()
      .or(z.literal("")),

    /* Valores */
    valor_investimento: z
      .number({ error: "Informe o valor de investimento." })
      .min(0, "Não pode ser negativo."),

    valor_custeio: z
      .number({ error: "Informe o valor de custeio." })
      .min(0, "Não pode ser negativo."),

    /* Vigência */
    prazo: z
      .string()
      .max(300)
      .optional()
      .or(z.literal("")),

    data_assinatura: z
      .string({ error: "Data de assinatura é obrigatória." })
      .min(1, "Data de assinatura é obrigatória."),

    data_fim_vigencia: z
      .string({ error: "Data de fim de vigência é obrigatória." })
      .min(1, "Data de fim é obrigatória."),

    situacao_atual: z.enum(
      ["Vigente", "Extinto", "Extinto, mas suporte vigente"],
      { error: "Selecione a situação." }
    ),

    observacoes: z.string().optional().or(z.literal("")),

    /* Equipe de Fiscalização */
    gestor_id: z.number().int().optional().or(z.literal(0)),
    fiscal_requisitante_id: z.number().int().optional().or(z.literal(0)),
    fiscal_tecnico_id: z.number().int().optional().or(z.literal(0)),
    fiscal_administrativo_id: z.number().int().optional().or(z.literal(0)),
  })
  .refine(
    (d) => {
      if (d.data_assinatura && d.data_fim_vigencia) {
        return d.data_fim_vigencia >= d.data_assinatura;
      }
      return true;
    },
    {
      message: "A data de fim de vigência deve ser posterior à data de assinatura.",
      path: ["data_fim_vigencia"],
    }
  );

export type ContratoCreateFormData = z.infer<typeof contratoCreateSchema>;

/* ── Limpar payload antes de enviar para a API ─────────────────────────── */

export function cleanContratoPayload(
  data: ContratoCreateFormData
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };

  // Converter IDs = 0 para null (equipe opcional)
  for (const key of [
    "gestor_id",
    "fiscal_requisitante_id",
    "fiscal_tecnico_id",
    "fiscal_administrativo_id",
  ]) {
    if (clean[key] === 0) clean[key] = null;
  }

  // Limpar strings vazias → null
  for (const key of [
    "fabricante",
    "tecnologia_utilizada",
    "prazo",
    "observacoes",
  ]) {
    if (clean[key] === "") clean[key] = null;
  }

  return clean;
}
