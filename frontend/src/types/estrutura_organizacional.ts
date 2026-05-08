export interface UnidadeOrg {
  id: number;
  nome: string;
  sigla: string | null;
  criado_em: string;
}

export interface UnidadeOrgCreatePayload {
  nome: string;
  sigla?: string | null;
}
