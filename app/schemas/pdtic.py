"""
ITER TIC - Schemas Pydantic do módulo PDTIC (Planejamento Estratégico)

Convenções:
  - *Create  → payload de entrada para criação (POST)
  - *Update  → payload de entrada para atualização parcial (PATCH)
  - *Response → payload de saída (GET / resposta de POST-PUT)
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import StatusAcaoEnum, TipoNecessidadeEnum
from app.schemas.estrutura_organizacional import UnidadeOrgResponse


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PERÍODO                                                                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class PdticPeriodoBase(BaseModel):
    ano_inicio: int = Field(..., ge=2000, le=2100, examples=[2024])
    ano_fim: int = Field(..., ge=2000, le=2100, examples=[2027])
    ativo: bool = True

    @model_validator(mode="after")
    def validar_intervalo(self) -> "PdticPeriodoBase":
        if self.ano_fim <= self.ano_inicio:
            raise ValueError("ano_fim deve ser maior que ano_inicio.")
        return self


class PdticPeriodoCreate(PdticPeriodoBase):
    """Payload para criação de um novo período PDTIC."""
    pass


class PdticPeriodoUpdate(BaseModel):
    """Atualização parcial de período."""
    ano_inicio: Optional[int] = Field(None, ge=2000, le=2100)
    ano_fim: Optional[int] = Field(None, ge=2000, le=2100)
    ativo: Optional[bool] = None


class PdticPeriodoResponse(PdticPeriodoBase):
    """Resposta com dados completos do período."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
    atualizado_em: datetime


class PdticPeriodoComRevisoesResponse(PdticPeriodoResponse):
    """Período com lista de revisões aninhada."""
    revisoes: list["PdticRevisaoResponse"] = []


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  REVISÃO                                                                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class PdticRevisaoBase(BaseModel):
    numero_revisao: int = Field(..., ge=0, examples=[0])
    data_aprovacao: Optional[date] = None
    descricao: Optional[str] = Field(None, max_length=500, examples=["Revisão inicial do PDTIC 2024-2027"])


class PdticRevisaoCreate(PdticRevisaoBase):
    """Payload para criação de uma nova revisão."""
    periodo_id: int


class PdticRevisaoUpdate(BaseModel):
    """Atualização parcial de revisão."""
    data_aprovacao: Optional[date] = None
    descricao: Optional[str] = Field(None, max_length=500)


class PdticRevisaoResponse(PdticRevisaoBase):
    """Resposta com dados completos da revisão."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    periodo_id: int
    criado_em: datetime


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  AÇÃO PDTIC                                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝




class PdticAcaoBase(BaseModel):
    """Campos compartilhados entre Create e Response."""

    codigo_acao: str = Field(
        ..., min_length=1, max_length=20, examples=["A1"]
    )
    departamento: Optional[str] = Field(None, max_length=200)
    unidade_demandante: Optional[str] = Field(None, max_length=200)
    unidade_responsavel: Optional[str] = Field(None, max_length=200)
    departamentos_ids: list[int] = Field(..., min_length=1, description="IDs dos departamentos associados.")
    unidades_demandantes_ids: list[int] = Field(..., min_length=1, description="IDs das unidades demandantes.")
    unidades_responsaveis_ids: list[int] = Field(..., min_length=1, description="IDs das unidades responsáveis.")
    necessidade: str = Field(..., min_length=1, max_length=20, examples=["N1"])
    descricao: str = Field(..., min_length=1)

    tipo_necessidade: list[str] = Field(
        ...,
        min_length=1,
        description="Lista de tipos: hardware, software, servico, comunicacao, capacitacao, outros.",
    )
    status: StatusAcaoEnum = StatusAcaoEnum.NAO_INICIADA

    @field_validator("tipo_necessidade", mode="before")
    @classmethod
    def validar_tipos_necessidade(cls, v: list[str]) -> list[str]:
        valores_validos = {e.value for e in TipoNecessidadeEnum}
        invalidos = [t for t in v if t not in valores_validos]
        if invalidos:
            raise ValueError(
                f"Tipo(s) inválido(s): {invalidos}. "
                f"Valores permitidos: {sorted(valores_validos)}"
            )
        return v

    meta: Optional[str] = None
    indicador: Optional[str] = None
    quantidade: Optional[str] = Field(None, max_length=100)

    total_gut: int = Field(
        ..., ge=0, le=125, description="Matriz GUT – valor entre 0 e 125."
    )

    previsao_contratacao: Optional[str] = Field(
        None,
        examples=["2025-06"],
        pattern=r"^\d{4}-\d{2}$",
        description="Data prevista para contratação (ISO: YYYY-MM)",
    )
    previsao_renovacao: Optional[str] = Field(
        None,
        examples=["2028-01"],
        pattern=r"^\d{4}-\d{2}$",
        description="Data prevista para renovação (ISO: YYYY-MM)",
    )

    valores_investimento: Optional[dict[str, float]] = Field(
        None,
        examples=[{"2024": 100000.00, "2025": 50000.00}],
        description="Valores de investimento (capital) por ano.",
    )
    valores_custeio: Optional[dict[str, float]] = Field(
        None,
        examples=[{"2024": 30000.00}],
        description="Valores de custeio por ano.",
    )

    # ── Validadores ─────────────────────────────────────────────────────────

    @field_validator("valores_investimento", "valores_custeio", mode="before")
    @classmethod
    def validar_chaves_valores_anuais(
        cls, v: Optional[dict[str, Any]]
    ) -> Optional[dict[str, float]]:
        """Garante que as chaves do JSONB sejam anos válidos (4 dígitos)
        e os valores sejam numéricos não-negativos."""
        if v is None:
            return v
        resultado: dict[str, float] = {}
        for chave, valor in v.items():
            if not re.match(r"^\d{4}$", str(chave)):
                raise ValueError(
                    f"Chave '{chave}' inválida. Use o formato de ano YYYY (ex: '2024')."
                )
            valor_float = float(valor)
            if valor_float < 0:
                raise ValueError(
                    f"Valor para '{chave}' não pode ser negativo ({valor_float})."
                )
            resultado[str(chave)] = valor_float
        return resultado


class PdticAcaoCreate(PdticAcaoBase):
    """Payload para criação de uma nova ação PDTIC."""

    periodo_id: int
    revisao_inclusao_id: int
    acao_pai_id: Optional[int] = Field(
        None,
        description="ID da ação anterior quando esta é uma revisão/alteração de uma ação existente.",
    )


class PdticAcaoUpdate(BaseModel):
    """Atualização parcial de uma ação PDTIC.

    Todos os campos são opcionais — somente os enviados serão atualizados.
    Nota: em fluxo de revisão completa, prefira criar uma nova `AcaoPdtic`
    vinculada à anterior via `acao_pai_id` para manter rastreabilidade.
    """

    departamento: Optional[str] = Field(None, max_length=200)
    unidade_demandante: Optional[str] = Field(None, max_length=200)
    unidade_responsavel: Optional[str] = Field(None, max_length=200)
    departamentos_ids: Optional[list[int]] = None
    unidades_demandantes_ids: Optional[list[int]] = None
    unidades_responsaveis_ids: Optional[list[int]] = None
    necessidade: Optional[str] = Field(None, min_length=1, max_length=20)
    descricao: Optional[str] = Field(None, min_length=1)

    tipo_necessidade: Optional[list[str]] = None
    status: Optional[StatusAcaoEnum] = None

    @field_validator("tipo_necessidade", mode="before")
    @classmethod
    def validar_tipos_necessidade_update(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        valores_validos = {e.value for e in TipoNecessidadeEnum}
        invalidos = [t for t in v if t not in valores_validos]
        if invalidos:
            raise ValueError(
                f"Tipo(s) inválido(s): {invalidos}. "
                f"Valores permitidos: {sorted(valores_validos)}"
            )
        return v

    meta: Optional[str] = None
    indicador: Optional[str] = None
    quantidade: Optional[str] = Field(None, max_length=100)

    total_gut: Optional[int] = Field(None, ge=0, le=125)

    previsao_contratacao: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")
    previsao_renovacao: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")

    valores_investimento: Optional[dict[str, float]] = None
    valores_custeio: Optional[dict[str, float]] = None


class PdticAcaoExcluir(BaseModel):
    """Payload para exclusão lógica de uma ação em uma revisão."""
    revisao_exclusao_id: int = Field(
        ..., description="ID da revisão em que a ação está sendo excluída."
    )


class PdticAcaoResponse(PdticAcaoBase):
    """Resposta completa de uma ação PDTIC."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    periodo_id: int
    revisao_inclusao_id: int
    revisao_exclusao_id: Optional[int] = None
    acao_pai_id: Optional[int] = None
    departamentos_rel: list["UnidadeOrgResponse"] = []
    unidades_demandantes_rel: list["UnidadeOrgResponse"] = []
    unidades_responsaveis_rel: list["UnidadeOrgResponse"] = []
    criado_em: datetime
    atualizado_em: datetime

    @property
    def esta_ativa(self) -> bool:
        return self.revisao_exclusao_id is None


class PdticAcaoComHistoricoResponse(PdticAcaoResponse):
    """Ação com informações da revisão de inclusão e (opcionalmente) exclusão."""
    revisao_inclusao: Optional[PdticRevisaoResponse] = None
    revisao_exclusao: Optional[PdticRevisaoResponse] = None


class PdticPainelResponse(BaseModel):
    """Resposta para a tela única de painel do PDTIC,
    contendo o período, suas revisões e todas as ações."""
    model_config = ConfigDict(from_attributes=True)

    periodo: PdticPeriodoResponse
    revisoes: list[PdticRevisaoResponse] = []
    acoes_ativas: list[PdticAcaoResponse] = []
    acoes_excluidas: list[PdticAcaoResponse] = []


# ── Resolver forward references ───────────────────────────────────────────
PdticPeriodoComRevisoesResponse.model_rebuild()
