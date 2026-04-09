"""
ITER TIC - Schemas Pydantic do módulo PACC (Plano Anual de Contratações)

Convenções (mesmas do PDTIC):
  - *Create  → payload de entrada para criação (POST)
  - *Update  → payload de entrada para atualização parcial (PATCH)
  - *Response → payload de saída (GET / resposta de POST-PUT)
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.pdtic import PdticAcaoResponse


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  EXERCÍCIO                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class PaccExercicioBase(BaseModel):
    ano: int = Field(..., ge=2000, le=2100, examples=[2025])
    ativo: bool = True


class PaccExercicioCreate(PaccExercicioBase):
    """Payload para criação de um novo exercício PACC."""
    pass


class PaccExercicioUpdate(BaseModel):
    """Atualização parcial de exercício."""
    ano: Optional[int] = Field(None, ge=2000, le=2100)
    ativo: Optional[bool] = None


class PaccExercicioResponse(PaccExercicioBase):
    """Resposta com dados completos do exercício."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    atualizado_em: datetime


class PaccExercicioComRevisoesResponse(PaccExercicioResponse):
    """Exercício com lista de revisões aninhada."""
    revisoes: list["PaccRevisaoResponse"] = []


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  REVISÃO                                                                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class PaccRevisaoBase(BaseModel):
    numero_revisao: int = Field(..., ge=0, examples=[0])
    data_aprovacao: Optional[date] = None
    descricao: Optional[str] = Field(
        None, max_length=500, examples=["Revisão inicial do PACC 2025"]
    )


class PaccRevisaoCreate(PaccRevisaoBase):
    """Payload para criação de uma nova revisão."""
    exercicio_id: int


class PaccRevisaoUpdate(BaseModel):
    """Atualização parcial de revisão."""
    data_aprovacao: Optional[date] = None
    descricao: Optional[str] = Field(None, max_length=500)


class PaccRevisaoResponse(PaccRevisaoBase):
    """Resposta com dados completos da revisão."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercicio_id: int
    criado_em: datetime


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITEM PACC                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝

_RE_PROCESSO_SEI = re.compile(r"^\d{5}-\d{8}/\d{4}-\d{2}$")


class PaccItemBase(BaseModel):
    """Campos compartilhados entre Create e Response."""

    numero_item: str = Field(
        ..., min_length=1, max_length=20, examples=["1"]
    )
    descricao_demanda: str = Field(..., min_length=1)
    quantidade: str = Field(
        ...,
        min_length=1,
        max_length=100,
        examples=["1", "200", "diversos"],
        description='Quantidade estimada (pode ser texto livre, ex: "diversos").',
    )
    valor_estimado: Decimal = Field(
        ...,
        ge=0,
        decimal_places=2,
        examples=[150000.00],
        description="Valor estimado da contratação em R$.",
    )
    processo_sei: Optional[str] = Field(
        None,
        max_length=50,
        examples=["00052-00032300/2024-09"],
        description="Número do processo SEI.",
    )

    # ── Validadores ─────────────────────────────────────────────────────────

    @field_validator("processo_sei", mode="before")
    @classmethod
    def validar_processo_sei(cls, v: Optional[str]) -> Optional[str]:
        """Valida o formato do número do processo SEI, se fornecido."""
        if v is None or v.strip() == "":
            return None
        if not _RE_PROCESSO_SEI.match(v.strip()):
            raise ValueError(
                f"Formato do processo SEI inválido: '{v}'. "
                "Use o formato NNNNN-NNNNNNNN/YYYY-NN (ex: 00052-00032300/2024-09)."
            )
        return v.strip()

    @field_validator("valor_estimado", mode="before")
    @classmethod
    def coercer_valor_estimado(cls, v) -> Decimal:
        """Aceita int, float ou string e converte para Decimal."""
        if isinstance(v, Decimal):
            return v
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError(f"Valor estimado inválido: '{v}'.")


class PaccItemCreate(PaccItemBase):
    """Payload para criação de um novo item PACC."""

    exercicio_id: int
    revisao_inclusao_id: int
    acao_pdtic_id: int = Field(
        ..., description="ID da ação PDTIC à qual este item está vinculado."
    )
    item_pai_id: Optional[int] = Field(
        None,
        description="ID do item anterior quando este é uma revisão/alteração.",
    )


class PaccItemUpdate(BaseModel):
    """Atualização parcial de um item PACC.

    Nota: em fluxo de revisão, prefira criar um novo `ItemPacc` vinculado
    via `item_pai_id` para manter rastreabilidade completa.
    """

    descricao_demanda: Optional[str] = Field(None, min_length=1)
    quantidade: Optional[str] = Field(None, min_length=1, max_length=100)
    valor_estimado: Optional[Decimal] = Field(None, ge=0)
    processo_sei: Optional[str] = Field(None, max_length=50)
    acao_pdtic_id: Optional[int] = None


class PaccItemExcluir(BaseModel):
    """Payload para exclusão lógica de um item em uma revisão."""
    revisao_exclusao_id: int = Field(
        ..., description="ID da revisão em que o item está sendo excluído."
    )


class PaccItemResponse(PaccItemBase):
    """Resposta completa de um item PACC."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercicio_id: int
    revisao_inclusao_id: int
    revisao_exclusao_id: Optional[int] = None
    item_pai_id: Optional[int] = None
    acao_pdtic_id: int
    criado_em: datetime
    atualizado_em: datetime

    @property
    def esta_ativo(self) -> bool:
        return self.revisao_exclusao_id is None


class PaccItemComAcaoResponse(PaccItemResponse):
    """Item com informações da ação PDTIC vinculada."""
    acao_pdtic: Optional[PdticAcaoResponse] = None


class PaccItemComHistoricoResponse(PaccItemResponse):
    """Item com informações das revisões de inclusão e exclusão."""
    revisao_inclusao: Optional[PaccRevisaoResponse] = None
    revisao_exclusao: Optional[PaccRevisaoResponse] = None
    acao_pdtic: Optional[PdticAcaoResponse] = None


class PaccPainelResponse(BaseModel):
    """Resposta para a tela única de painel do PACC,
    contendo o exercício, suas revisões e todos os itens."""
    model_config = ConfigDict(from_attributes=True)

    exercicio: PaccExercicioResponse
    revisoes: list[PaccRevisaoResponse] = []
    itens_ativos: list[PaccItemComAcaoResponse] = []
    itens_excluidos: list[PaccItemResponse] = []


# ── Resolver forward references ───────────────────────────────────────────
PaccExercicioComRevisoesResponse.model_rebuild()
PaccItemComHistoricoResponse.model_rebuild()
PaccItemComAcaoResponse.model_rebuild()
