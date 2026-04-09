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

from app.models.contrato import TipoContratoEnum, SituacaoContratoEnum, TipoRegistroHistoricoEnum

_RE_NUMERO_CONTRATO = re.compile(r"^\d{2,3}/\d{4}$")


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


class _EquipeFiscalizacao(BaseModel):
    """Equipe completa de fiscalização do contrato."""
    gestor: Optional[_ServidorResumo] = None
    fiscal_requisitante: Optional[_ServidorResumo] = None
    fiscal_tecnico: Optional[_ServidorResumo] = None
    fiscal_administrativo: Optional[_ServidorResumo] = None


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
# ║  CONTRATO - CREATE                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoCreate(BaseModel):
    """Payload para criação de um novo contrato."""

    projeto_id: int
    numero_contrato: str = Field(
        ..., max_length=20,
        examples=["42/2025"],
        description="Formato obrigatório: NN/YYYY ou NNN/YYYY.",
    )
    empresa_contratada: str = Field(
        ..., min_length=1, max_length=500,
        examples=["Tech Solutions Ltda."],
    )
    fabricante: Optional[str] = Field(None, max_length=300, examples=["Cisco"])
    tipo_contrato: TipoContratoEnum
    quantidade: int = Field(..., ge=1, examples=[50])
    tecnologia_utilizada: Optional[str] = Field(
        None, max_length=500, examples=["Switches Catalyst 9300"]
    )

    valor_investimento: Decimal = Field(
        default=Decimal(0), ge=0, examples=[450000.00],
    )
    valor_custeio: Decimal = Field(
        default=Decimal(0), ge=0, examples=[120000.00],
    )

    prazo: Optional[str] = Field(
        None, max_length=300,
        examples=["12 meses; 24 meses com suporte"],
    )
    data_assinatura: date = Field(..., examples=["2025-06-15"])
    data_fim_vigencia: date = Field(..., examples=["2026-06-14"])

    situacao_atual: SituacaoContratoEnum = SituacaoContratoEnum.VIGENTE
    observacoes: Optional[str] = None

    # Equipe de fiscalização (IDs)
    gestor_id: Optional[int] = None
    fiscal_requisitante_id: Optional[int] = None
    fiscal_tecnico_id: Optional[int] = None
    fiscal_administrativo_id: Optional[int] = None

    @field_validator("numero_contrato", mode="before")
    @classmethod
    def validar_numero_contrato(cls, v: str) -> str:
        v = v.strip()
        if not _RE_NUMERO_CONTRATO.match(v):
            raise ValueError(
                f"Formato do número do contrato inválido: '{v}'. "
                "Use o formato NN/YYYY ou NNN/YYYY (ex: 42/2025)."
            )
        return v

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

    numero_contrato: Optional[str] = Field(None, max_length=20)
    empresa_contratada: Optional[str] = Field(None, min_length=1, max_length=500)
    fabricante: Optional[str] = Field(None, max_length=300)
    tipo_contrato: Optional[TipoContratoEnum] = None
    quantidade: Optional[int] = Field(None, ge=1)
    tecnologia_utilizada: Optional[str] = Field(None, max_length=500)

    valor_investimento: Optional[Decimal] = Field(None, ge=0)
    valor_custeio: Optional[Decimal] = Field(None, ge=0)

    prazo: Optional[str] = Field(None, max_length=300)
    data_assinatura: Optional[date] = None
    data_fim_vigencia: Optional[date] = None

    situacao_atual: Optional[SituacaoContratoEnum] = None
    observacoes: Optional[str] = None

    gestor_id: Optional[int] = None
    fiscal_requisitante_id: Optional[int] = None
    fiscal_tecnico_id: Optional[int] = None
    fiscal_administrativo_id: Optional[int] = None

    @field_validator("numero_contrato", mode="before")
    @classmethod
    def validar_numero_contrato(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _RE_NUMERO_CONTRATO.match(v):
            raise ValueError(
                f"Formato do número do contrato inválido: '{v}'. "
                "Use o formato NN/YYYY ou NNN/YYYY (ex: 42/2025)."
            )
        return v


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO - RESPONSE                                                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoResponse(BaseModel):
    """Resposta completa do contrato com campos computados e aninhados."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_contrato: str
    projeto_id: int
    empresa_contratada: str
    fabricante: Optional[str] = None
    tipo_contrato: TipoContratoEnum
    quantidade: int
    tecnologia_utilizada: Optional[str] = None

    valor_investimento: Decimal
    valor_custeio: Decimal

    prazo: Optional[str] = None
    data_assinatura: date
    data_fim_vigencia: date

    situacao_atual: SituacaoContratoEnum
    observacoes: Optional[str] = None

    criado_em: datetime
    atualizado_em: datetime

    # Equipe IDs
    gestor_id: Optional[int] = None
    fiscal_requisitante_id: Optional[int] = None
    fiscal_tecnico_id: Optional[int] = None
    fiscal_administrativo_id: Optional[int] = None

    # Computed field
    valor_total: Decimal = Field(default=Decimal(0))

    # Aninhados (populados na rota)
    projeto_origem: Optional[_ProjetoOrigemResumo] = None
    acoes_pdtic_vinculadas: list[_AcaoPdticResumo] = []
    equipe: Optional[_EquipeFiscalizacao] = None
    historico: list[HistoricoContratoResponse] = []


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO - LISTAGEM (otimizado para grid)                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoListagemResponse(BaseModel):
    """Resposta otimizada para listagem/grid de contratos."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_contrato: str
    empresa_contratada: str
    tipo_contrato: TipoContratoEnum
    situacao_atual: SituacaoContratoEnum
    valor_investimento: Decimal
    valor_custeio: Decimal
    valor_total: Decimal = Field(default=Decimal(0))
    data_assinatura: date
    data_fim_vigencia: date
    quantidade: int

    # Projeto resumido
    projeto_nome: Optional[str] = None
    projeto_processo_sei: Optional[str] = None

    # Gestor resumido
    nome_gestor: Optional[str] = None
