"""
ITER TIC - Schemas Pydantic do Módulo 2: Projetos e Licitações

Convenções (iguais ao Módulo 1):
  - *Create  → payload de entrada para criação (POST)
  - *Update  → payload de entrada para atualização parcial (PATCH)
  - *Response → payload de saída (GET / resposta de POST-PUT)
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.projeto import (
    StatusProjetoEnum,
    TipoArtefatoEnum,
    StatusArtefatoEnum,
    TipoDataAlteradaEnum,
)

_RE_PROCESSO_SEI = re.compile(r"^\d{5}-\d{8}/\d{4}-\d{2}$")


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  UNIDADE ORGANIZACIONAL (Resumo)                                         ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class _UnidadeOrgResumo(BaseModel):
    """Resumo de uma Unidade Organizacional para aninhamento no Servidor."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    sigla: Optional[str] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SERVIDOR                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ServidorBase(BaseModel):
    matricula: str = Field(
        ..., min_length=1, max_length=30, examples=["1234567"]
    )
    nome: str = Field(
        ..., min_length=1, max_length=200, examples=["João da Silva"]
    )
    cargo: str = Field(
        ..., min_length=1, max_length=200, examples=["Analista de TI"]
    )
    funcao: Optional[str] = Field(
        None, max_length=200, examples=["Chefe de Seção"]
    )
    departamento_id: int = Field(..., description="ID do Departamento.")
    unidade_lotacao_id: Optional[int] = Field(None, description="ID da Unidade de Lotação.")
    secao_id: Optional[int] = Field(None, description="ID da Seção.")
    email_funcional: Optional[EmailStr] = Field(
        None, max_length=200, examples=["servidor@orgao.gov.br"]
    )



class ServidorCreate(ServidorBase):
    """Payload para criação de um novo servidor."""
    pass


class ServidorUpdate(BaseModel):
    """Atualização parcial de servidor."""
    matricula: Optional[str] = Field(None, min_length=1, max_length=30)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    cargo: Optional[str] = Field(None, min_length=1, max_length=200)
    funcao: Optional[str] = Field(None, max_length=200)
    departamento_id: Optional[int] = None
    unidade_lotacao_id: Optional[int] = None
    secao_id: Optional[int] = None
    email_funcional: Optional[EmailStr] = Field(None, max_length=200)


class ServidorResponse(ServidorBase):
    """Resposta com dados completos do servidor."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    atualizado_em: datetime

    # Relacionamentos aninhados
    departamento: Optional[_UnidadeOrgResumo] = None
    unidade_lotacao: Optional[_UnidadeOrgResumo] = None
    secao: Optional[_UnidadeOrgResumo] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ARTEFATO                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ArtefatoBase(BaseModel):
    tipo: TipoArtefatoEnum
    status: StatusArtefatoEnum = StatusArtefatoEnum.NAO_INICIADO
    data_inicio: Optional[date] = None
    data_fim_prevista: Optional[date] = None
    data_conclusao: Optional[date] = None
    justificativa_atraso: Optional[str] = None
    observacoes: Optional[str] = None


class ArtefatoCreate(BaseModel):
    """Payload para criação de artefato vinculado a um projeto."""
    projeto_id: int
    tipo: TipoArtefatoEnum
    observacoes: Optional[str] = None


class ArtefatoUpdate(BaseModel):
    """Atualização parcial de artefato.

    ATENÇÃO: alterar `data_inicio` de um artefato já iniciado
    exige `justificativa_alteracao` no payload.
    Se `data_conclusao` > `data_fim_prevista`, `justificativa_atraso` é obrigatória.
    """
    status: Optional[StatusArtefatoEnum] = None
    data_inicio: Optional[date] = None
    data_conclusao: Optional[date] = None
    observacoes: Optional[str] = None
    justificativa_alteracao: Optional[str] = None
    justificativa_atraso: Optional[str] = None


class ArtefatoResponse(ArtefatoBase):
    """Resposta com dados completos do artefato."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    dias_decorridos: Optional[int] = None
    criado_em: datetime
    atualizado_em: datetime


class ArtefatoComHistoricoResponse(ArtefatoResponse):
    """Artefato com histórico de alterações de datas aninhado."""
    historico_datas: list["HistoricoDataArtefatoResponse"] = []


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  COMENTÁRIO DE ARTEFATO (histórico de observações)                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ComentarioArtefatoCreate(BaseModel):
    """Payload para adição de comentário/observação."""
    conteudo: str = Field(..., min_length=1, max_length=2000)
    autor: Optional[str] = Field(None, max_length=200)


class ComentarioArtefatoResponse(BaseModel):
    """Resposta de um comentário de artefato."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    artefato_id: int
    conteudo: str
    autor: str
    criado_em: datetime


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HISTÓRICO DE DATA DE ARTEFATO (auditoria)                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class HistoricoDataArtefatoCreate(BaseModel):
    """Payload para registrar alteração de data com justificativa."""
    artefato_id: int
    tipo_data_alterada: TipoDataAlteradaEnum
    data_antiga: date
    data_nova: date
    justificativa: str = Field(
        ...,
        min_length=10,
        description="Justificativa obrigatória (mín. 10 caracteres).",
    )


class HistoricoDataArtefatoResponse(BaseModel):
    """Resposta de um registro de auditoria de data."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    artefato_id: int
    tipo_data_alterada: TipoDataAlteradaEnum
    data_antiga: date
    data_nova: date
    justificativa: str
    data_registro: datetime


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PROJETO                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ProjetoBase(BaseModel):
    nome: str = Field(
        ..., min_length=1, max_length=500,
        examples=["Aquisição de Switches Core para o Datacenter"],
    )
    processo_sei: str = Field(
        ..., max_length=50,
        examples=["00052-00032300/2024-09"],
    )
    prioridade: str = Field(
        default="media",
        examples=["baixa", "media", "alta"]
    )
    complexidade: str = Field(
        default="Simples",
        examples=["Simples", "Intermediária", "Complexa"]
    )

    @field_validator("processo_sei", mode="before")
    @classmethod
    def validar_processo_sei(cls, v: str) -> str:
        v = v.strip()
        if not _RE_PROCESSO_SEI.match(v):
            raise ValueError(
                f"Formato do processo SEI inválido: '{v}'. "
                "Use o formato NNNNN-NNNNNNNN/YYYY-NN (ex: 00052-00032300/2024-09)."
            )
        return v


class ProjetoCreate(ProjetoBase):
    """Payload para criação de um novo projeto.

    - As listas de vínculos (PDTIC e PACC) podem vir vazias.
    - A equipe é opcional na criação.
    """
    status: StatusProjetoEnum = StatusProjetoEnum.FASE_INTERNA

    # Equipe (opcional na criação)
    integrante_requisitante_id: Optional[int] = None
    integrante_tecnico_id: Optional[int] = None
    integrante_administrativo_id: Optional[int] = None

    # Vínculos com Planejamento Estratégico (podem ser vazios na criação)
    acoes_pdtic_ids: list[int] = Field(
        default_factory=list,
        description="IDs das ações PDTIC vinculadas ao projeto.",
        examples=[[1, 3]],
    )
    itens_pacc_ids: list[int] = Field(
        default_factory=list,
        description="IDs dos itens PACC vinculados ao projeto.",
        examples=[[1, 2]],
    )


class ProjetoUpdate(BaseModel):
    """Atualização parcial de projeto."""
    nome: Optional[str] = Field(None, min_length=1, max_length=500)
    processo_sei: Optional[str] = Field(None, max_length=50)
    prioridade: Optional[str] = None
    complexidade: Optional[str] = None
    status: Optional[StatusProjetoEnum] = None

    integrante_requisitante_id: Optional[int] = None
    integrante_tecnico_id: Optional[int] = None
    integrante_administrativo_id: Optional[int] = None

    acoes_pdtic_ids: Optional[list[int]] = None
    itens_pacc_ids: Optional[list[int]] = None

    @field_validator("processo_sei", mode="before")
    @classmethod
    def validar_processo_sei(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _RE_PROCESSO_SEI.match(v):
            raise ValueError(
                f"Formato do processo SEI inválido: '{v}'. "
                "Use o formato NNNNN-NNNNNNNN/YYYY-NN."
            )
        return v


# ── Schemas de resposta "simplificados" para aninhamento ─────────────────

class _AcaoPdticResumo(BaseModel):
    """Resumo de uma ação PDTIC para aninhamento no Projeto."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_acao: str
    descricao: str
    status: str
    tipo_necessidade: str


class _ItemPaccResumo(BaseModel):
    """Resumo de um item PACC para aninhamento no Projeto."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_item: str
    descricao_demanda: str
    valor_estimado: Decimal
    processo_sei: Optional[str] = None


# ── Schemas de resposta completos ────────────────────────────────────────

class ProjetoResponse(ProjetoBase):
    """Resposta com dados completos do projeto (sem eager-load profundo)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: StatusProjetoEnum
    criado_em: datetime
    atualizado_em: datetime

    # Equipe (IDs)
    integrante_requisitante_id: Optional[int] = None
    integrante_tecnico_id: Optional[int] = None
    integrante_administrativo_id: Optional[int] = None

    # Fase Externa (Licitação)
    data_envio_licitacao: Optional[date] = None
    situacao_licitacao_texto: Optional[str] = None


class ProjetoComDetalhesResponse(ProjetoResponse):
    """Resposta enriquecida: equipe populada + artefatos + vínculos PDTIC/PACC."""

    # Equipe completa (eager-loaded)
    integrante_requisitante: Optional[ServidorResponse] = None
    integrante_tecnico: Optional[ServidorResponse] = None
    integrante_administrativo: Optional[ServidorResponse] = None

    # Vínculos com planejamento
    acoes_pdtic: list[_AcaoPdticResumo] = []
    itens_pacc: list[_ItemPaccResumo] = []

    # Artefatos do projeto
    artefatos: list[ArtefatoResponse] = []

    # Tramitações da fase externa (log de auditoria)
    tramitacoes: list["ProjetoTramitacaoResponse"] = []


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PAINEL DO PROJETO (visão consolidada para o front-end)                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ProjetoPainelResponse(BaseModel):
    """Resposta consolidada para a tela de detalhes de um projeto."""
    model_config = ConfigDict(from_attributes=True)

    projeto: ProjetoComDetalhesResponse
    total_artefatos: int
    artefatos_concluidos: int
    artefatos_pendentes: int
    progresso_percentual: float = Field(
        ..., ge=0, le=100,
        description="Percentual de artefatos concluídos.",
    )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LISTAGEM DE PROJETOS (para a grid do front-end)                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ComentarioResumoListagem(BaseModel):
    """Resumo de comentário para tooltip na listagem."""
    id: int
    conteudo: str
    autor: str
    criado_em: datetime


class ArtefatoResumoListagem(BaseModel):
    """Resumo ultra-leve de artefato para a esteira de pipeline."""
    id: Optional[int] = None
    tipo: str
    status: str
    dias_decorridos: Optional[int] = None
    ultimo_comentario: Optional[str] = None
    total_comentarios: int = 0
    data_inicio: Optional[date] = None
    data_fim_prevista: Optional[date] = None
    data_conclusao: Optional[date] = None
    justificativa_atraso: Optional[str] = None
    comentarios: list[ComentarioResumoListagem] = []


class TramitacaoResumoListagem(BaseModel):
    """Resumo de tramitação para exibição na listagem principal."""
    id: int
    observacao: str
    autor: str
    data_hora: datetime


class ProjetoListagemResponse(BaseModel):
    """Resposta otimizada para listagem/grid de projetos."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    processo_sei: str
    prioridade: str
    complexidade: str
    status: StatusProjetoEnum
    criado_em: datetime

    # Contagens (calculadas na rota)
    qtd_acoes_pdtic: int = 0
    qtd_itens_pacc: int = 0
    qtd_artefatos_total: int = 0
    qtd_artefatos_concluidos: int = 0

    # Esteira de artefatos (pipeline visual)
    artefatos_resumo: list[ArtefatoResumoListagem] = []

    # Equipe resumida (apenas nomes)
    nome_requisitante: Optional[str] = None
    nome_tecnico: Optional[str] = None
    nome_administrativo: Optional[str] = None

    # Fase Externa (Licitação)
    data_envio_licitacao: Optional[date] = None
    situacao_licitacao_texto: Optional[str] = None

    # Tramitações (resumo para a listagem)
    tramitacoes_resumo: list[TramitacaoResumoListagem] = []
    total_tramitacoes: int = 0


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  FASE EXTERNA — TRAMITAÇÃO LICITAÇÃO                                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ProjetoTramitacaoLicitacaoUpdate(BaseModel):
    """Payload para atualizar o campo livre de andamento na licitação."""
    situacao_licitacao_texto: str = Field(
        ...,
        min_length=1,
        description="Descrição livre do andamento na área de compras/licitação.",
        examples=["Processo na Procuradoria Jurídica para análise."],
    )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  TRAMITAÇÃO (Histórico da fase externa)                                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ProjetoTramitacaoCreate(BaseModel):
    """Payload para registrar um andamento (tramitação) na licitação."""
    observacao: str = Field(..., min_length=1, max_length=2000)
    autor: Optional[str] = Field(None, max_length=200)


class ProjetoTramitacaoResponse(BaseModel):
    """Resposta de uma inserção no log de auditoria da licitação."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    observacao: str
    autor: str
    data_hora: datetime


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OBSERVAÇÃO FASE EXTERNA (Diário de Bordo)                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class ObservacaoFaseExternaCreate(BaseModel):
    """Payload para adicionar uma observação na Fase Externa."""
    texto: str = Field(..., min_length=1)


class UsuarioResumoParaObservacao(BaseModel):
    """Resumo do Usuário que criou a observação."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str


class ObservacaoFaseExternaResponse(BaseModel):
    """Resposta de uma Observação da Fase Externa."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    projeto_id: int
    texto: str
    criado_em: datetime
    usuario: Optional[UsuarioResumoParaObservacao] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  EVENTO DE HISTÓRICO (Timeline)                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class HistoricoEventoResponse(BaseModel):
    """Evento para a timeline de histórico do projeto."""
    id: str  # Pode ser um UUID ou string gerada
    data_evento: datetime
    titulo: str
    descricao: str
    tipo: str  # ex: "criacao", "inicio", "conclusao", "atraso"
    icone: str  # ex: "folder", "play", "check", "alert"
