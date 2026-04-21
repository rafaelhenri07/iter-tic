/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod para Contrato
 * Espelha as regras do Pydantic no backend (ContratoCreate)
 *
 * Equipe de Fiscalização: cada papel aceita 1 titular_id + N substitutos_ids.
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";

const RE_NUMERO_CONTRATO = /^\d{2,3}\/\d{4}$/;

/* ── Sub-schema: um papel da equipe (titular + substitutos) ────────────── */

const equipePapelSchema = z.object({
  titular_id: z.number().int().optional().or(z.literal(0)),
  substitutos_ids: z.array(z.number().int()).default([]),
});

const equipeSchema = z.object({
  gestor: equipePapelSchema.default({ titular_id: 0, substitutos_ids: [] }),
  fiscal_requisitante: equipePapelSchema.default({ titular_id: 0, substitutos_ids: [] }),
  fiscal_tecnico: equipePapelSchema.default({ titular_id: 0, substitutos_ids: [] }),
  fiscal_administrativo: equipePapelSchema.default({ titular_id: 0, substitutos_ids: [] }),
});

/* ── Schema principal ──────────────────────────────────────────────────── */

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

    fabricante_id: z
      .number()
      .int()
      .optional()
      .or(z.literal(0)),

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

    /* Equipe de Fiscalização (novo formato: titular + substitutos) */
    equipe: equipeSchema.optional(),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean: Record<string, any> = { ...data };

  // Converter fabricante_id = 0 → null
  if (clean.fabricante_id === 0) clean.fabricante_id = null;

  // Limpar strings vazias → null
  for (const key of ["tecnologia_utilizada", "prazo", "observacoes"]) {
    if (clean[key] === "") clean[key] = null;
  }

  // Transformar equipe: converter titular_id=0 → null, filtrar substitutos
  if (clean.equipe) {
    const equipeLimpa: Record<string, unknown> = {};
    for (const papel of [
      "gestor",
      "fiscal_requisitante",
      "fiscal_tecnico",
      "fiscal_administrativo",
    ]) {
      const p = clean.equipe[papel];
      if (p) {
        equipeLimpa[papel] = {
          titular_id: p.titular_id && p.titular_id > 0 ? p.titular_id : null,
          substitutos_ids: (p.substitutos_ids || []).filter(
            (id: number) => id > 0
          ),
        };
      }
    }
    clean.equipe = equipeLimpa;
  }

  return clean;
}
