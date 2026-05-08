"""
ITER TIC - Schemas Pydantic do Módulo 3: Execução e Fiscalização (Contratos)

Convenções (iguais aos demais módulos):
  - *Create  → payload de entrada para criação (POST)
  - *Update  → payload de entrada para atualização parcial (PATCH)
  - *Response → payload de saída (GET / resposta de POST-PUT)
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, computed_field

from app.models.contrato import TipoContratoEnum, SituacaoContratoEnum, TipoRegistroHistoricoEnum, ModalidadeContratoEnum
from app.schemas.aditivo import AditivoResponse  # noqa: E402


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SCHEMAS ANINHADOS (para Response enriquecido)                         ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class _ProjetoOrigemResumo(BaseModel):
    """Resumo do projeto de origem para aninhamento no Contrato."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    processo_sei: str


class _AcaoPdticResumo(BaseModel):
    """Resumo da ação PDTIC vinculada ao projeto de origem."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_acao: str
    descricao: str


class _ServidorResumo(BaseModel):
    """Resumo de servidor para a equipe de fiscalização."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    cargo: str
    matricula: str


# ── Schemas de Equipe (novo modelo: Titular + Substitutos) ──────────────

class EquipePapelInput(BaseModel):
    """Entrada para um papel específico da equipe."""
    titular_id: Optional[int] = None
    substitutos_ids: list[int] = []


class EquipeInput(BaseModel):
    """Entrada completa da equipe de fiscalização."""
    gestor: Optional[EquipePapelInput] = None
    fiscal_requisitante: Optional[EquipePapelInput] = None
    fiscal_tecnico: Optional[EquipePapelInput] = None
    fiscal_administrativo: Optional[EquipePapelInput] = None


class EquipeMembroResponse(BaseModel):
    """Um membro individual da equipe de fiscalização (response)."""
    id: int
    papel: str
    is_titular: bool
    servidor: _ServidorResumo


class EquipePapelResponse(BaseModel):
    """Resposta agrupada de um papel (titular + substitutos)."""
    titular: Optional[_ServidorResumo] = None
    substitutos: list[_ServidorResumo] = []


class EquipeFiscalizacaoResponse(BaseModel):
    """Equipe completa de fiscalização (response)."""
    gestor: Optional[EquipePapelResponse] = None
    fiscal_requisitante: Optional[EquipePapelResponse] = None
    fiscal_tecnico: Optional[EquipePapelResponse] = None
    fiscal_administrativo: Optional[EquipePapelResponse] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HISTÓRICO (Auditoria e Observações)                                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class HistoricoContratoResponse(BaseModel):
    """Um registro de histórico/auditoria do contrato."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    contrato_id: int
    data_hora: datetime
    autor: str
    tipo_registro: TipoRegistroHistoricoEnum
    conteudo: str


class ObservacaoContratoCreate(BaseModel):
    """Payload para adicionar uma observação manual."""
    conteudo: str = Field(..., min_length=1, max_length=5000)
    autor: str = Field(default="Usuário do Sistema", max_length=200)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITENS DO CONTRATO                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝

class ItemContratoCreate(BaseModel):
    objeto_contratado: str = Field(..., min_length=1, max_length=500)
    quantidade: int = Field(default=1, ge=1)
    valor_unitario: Decimal = Field(default=Decimal(0), ge=0)
    tipo_catalogo: Optional[str] = Field(None, max_length=10, description="CATMAT ou CATSER")
    codigo_catalogo: Optional[str] = Field(None, max_length=50)

class ItemContratoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contrato_id: int
    objeto_contratado: str
    quantidade: int
    valor_unitario: Decimal
    valor_total: Decimal
    tipo_catalogo: Optional[str] = None
    codigo_catalogo: Optional[str] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO - CREATE                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoCreate(BaseModel):
    """Payload para criação de um novo contrato."""

    projeto_id: int
    modalidade_contrato: ModalidadeContratoEnum = ModalidadeContratoEnum.CONTRATO
    numero: int = Field(..., gt=0, examples=[42])
    ano: int = Field(..., ge=2015, le=2035, examples=[2025])
    empresa_id: int = Field(
        ..., description="ID da empresa contratada (FK para tabela empresas).",
    )
    fabricante_id: Optional[int] = Field(None, description="ID do fabricante (FK para tabela fabricantes)")
    tipo_contrato: TipoContratoEnum
    itens: list[ItemContratoCreate] = Field(default_factory=list, description="Itens do contrato")

    data_inicio_vigencia: Optional[date] = Field(
        None, examples=["2025-06-15"],
        description="Data de início da vigência (opcional; se omitida, usa data_assinatura).",
    )
    vigencia_meses: Optional[int] = Field(
        None, ge=0, examples=[12],
        description="Quantidade de meses de vigência (calculado automaticamente).",
    )
    prorrogacao_meses: int = Field(
        default=0, ge=0, le=120, examples=[0],
        description="Prorrogação adicional em meses.",
    )
    data_assinatura: date = Field(..., examples=["2025-06-15"])
    data_fim_vigencia: date = Field(..., examples=["2026-06-14"])

    situacao_atual: SituacaoContratoEnum = SituacaoContratoEnum.VIGENTE
    observacoes: Optional[str] = None

    # Equipe de fiscalização (novo formato: Titular + Substitutos)
    equipe: Optional[EquipeInput] = None

    # Campos específicos de ARP
    orgao_gerenciador: Optional[str] = Field(None, max_length=300)


    @field_validator("data_fim_vigencia", mode="after")
    @classmethod
    def validar_vigencia(cls, v: date, info) -> date:
        assinatura = info.data.get("data_assinatura")
        if isinstance(assinatura, date) and isinstance(v, date) and v < assinatura:
            raise ValueError(
                "A data de fim de vigência não pode ser anterior "
                "à data de assinatura."
            )
        return v


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO - UPDATE                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoUpdate(BaseModel):
    """Atualização parcial de contrato."""

    numero: Optional[int] = Field(None, gt=0)
    ano: Optional[int] = Field(None, ge=2015, le=2035)
    modalidade_contrato: Optional[ModalidadeContratoEnum] = None
    orgao_gerenciador: Optional[str] = Field(None, max_length=300)
    empresa_id: Optional[int] = Field(None, description="ID da empresa contratada")
    fabricante_id: Optional[int] = None
    tipo_contrato: Optional[TipoContratoEnum] = None
    itens: Optional[list[ItemContratoCreate]] = None

    data_inicio_vigencia: Optional[date] = None
    vigencia_meses: Optional[int] = Field(None, ge=0)
    prorrogacao_meses: Optional[int] = Field(None, ge=0, le=120)
    data_assinatura: Optional[date] = None
    data_fim_vigencia: Optional[date] = None

    situacao_atual: Optional[SituacaoContratoEnum] = None
    observacoes: Optional[str] = None

    # Equipe (novo formato)
    equipe: Optional[EquipeInput] = None




# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO - RESPONSE                                                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoResponse(BaseModel):
    """Resposta completa do contrato com campos computados e aninhados."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: int
    ano: int
    modalidade_contrato: ModalidadeContratoEnum = ModalidadeContratoEnum.CONTRATO
    orgao_gerenciador: Optional[str] = None
    projeto_id: int
    empresa_id: Optional[int] = None
    empresa_nome: Optional[str] = None
    fabricante_id: Optional[int] = None
    fabricante_nome: Optional[str] = None
    tipo_contrato: TipoContratoEnum
    itens: list[ItemContratoResponse] = []

    data_inicio_vigencia: Optional[date] = None
    vigencia_meses: Optional[int] = None
    prorrogacao_meses: int = 0
    data_assinatura: date
    data_fim_vigencia: date

    situacao_atual: SituacaoContratoEnum
    observacoes: Optional[str] = None

    criado_em: datetime
    atualizado_em: datetime

    # Computed field
    valor_total: Decimal = Field(default=Decimal(0))

    # Aninhados (populados na rota)
    projeto_origem: Optional[_ProjetoOrigemResumo] = None
    acoes_pdtic_vinculadas: list[_AcaoPdticResumo] = []
    equipe: Optional[EquipeFiscalizacaoResponse] = None
    historico: list[HistoricoContratoResponse] = []
    aditivos: list[AditivoResponse] = []


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO - LISTAGEM (otimizado para grid)                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoListagemResponse(BaseModel):
    """Resposta otimizada para listagem/grid de contratos."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: int
    ano: int
    modalidade_contrato: ModalidadeContratoEnum = ModalidadeContratoEnum.CONTRATO
    empresa_id: Optional[int] = None
    empresa_nome: Optional[str] = None
    tipo_contrato: TipoContratoEnum
    situacao_atual: SituacaoContratoEnum
    valor_total: Decimal = Field(default=Decimal(0))
    data_assinatura: date
    data_fim_vigencia: date

    # Projeto resumido
    projeto_nome: Optional[str] = None
    projeto_processo_sei: Optional[str] = None

    # Gestor resumido
    nome_gestor: Optional[str] = None
