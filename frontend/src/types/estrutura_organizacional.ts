export interface UnidadeOrg {
  id: number;
  nome: string;
  sigla: string | null;
  unidade_pai_id: number | null;
  caminho_completo: string;
  criado_em: string;
}

export interface UnidadeOrgCreatePayload {
  nome: string;
  sigla?: string | null;
  unidade_pai_id?: number | null;
}
