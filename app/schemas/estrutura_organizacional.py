"""
ITER TIC - Schemas Pydantic: Estrutura Organizacional (Unificada)

Schema para a tabela única unidades_organizacionais.
Aplica auto-uppercase nos campos nome e sigla.
Suporta hierarquia autorreferenciada com caminho_completo.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UnidadeOrgCreate(BaseModel):
    """Payload para criação de uma Unidade Organizacional."""
    nome: str = Field(..., min_length=1, max_length=200)
    sigla: Optional[str] = Field(None, max_length=20)
    unidade_pai_id: Optional[int] = None

    @field_validator("nome", mode="before")
    @classmethod
    def nome_uppercase(cls, v: str) -> str:
        return v.strip().upper() if isinstance(v, str) else v

    @field_validator("sigla", mode="before")
    @classmethod
    def sigla_uppercase(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if isinstance(v, str) and v else v


class UnidadeOrgUpdate(BaseModel):
    """Payload para atualização parcial de uma Unidade Organizacional."""
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    sigla: Optional[str] = Field(None, max_length=20)
    unidade_pai_id: Optional[int] = None

    @field_validator("nome", mode="before")
    @classmethod
    def nome_uppercase(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if isinstance(v, str) and v else v

    @field_validator("sigla", mode="before")
    @classmethod
    def sigla_uppercase(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if isinstance(v, str) and v else v


class UnidadeOrgResponse(BaseModel):
    """Resposta para qualquer Unidade Organizacional."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    sigla: Optional[str] = None
    unidade_pai_id: Optional[int] = None
    caminho_completo: str
    criado_em: datetime
