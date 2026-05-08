"""
ITER TIC - Schemas Pydantic do Módulo 3: Aditivos de Prazo
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AditivoCreate(BaseModel):
    """Payload para criação de um novo Aditivo de Prazo."""
    numero_aditivo: str = Field(
        ..., max_length=100,
        examples=["1º Termo Aditivo"],
        description="Identificação do aditivo (ex: '1º Termo Aditivo').",
    )
    data_inicio_vigencia: date = Field(
        ..., examples=["2026-06-15"],
        description="Data de início da nova vigência do aditivo.",
    )
    data_fim_vigencia: date = Field(
        ..., examples=["2027-06-14"],
        description="Nova data de fim de vigência estabelecida pelo aditivo.",
    )


class AditivoResponse(BaseModel):
    """Resposta de um Aditivo de Prazo."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    contrato_id: int
    numero_aditivo: str
    data_inicio_vigencia: date
    data_fim_vigencia: date
    criado_em: datetime
