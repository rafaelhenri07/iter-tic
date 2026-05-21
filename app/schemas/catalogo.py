"""
ITER TIC — Pydantic Schemas: Catálogo de Produtos/Serviços

Schemas de criação, atualização e resposta enriquecida com
inteligência de relacionamento (portfólio e contratações).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CatalogoProdutoCreate(BaseModel):
    """Payload para criação de um item do catálogo."""
    nome: str = Field(..., min_length=2, max_length=300)
    tipo: str = Field("PRODUTO", pattern="^(PRODUTO|SERVICO)$")


class CatalogoProdutoUpdate(BaseModel):
    """Payload para atualização de um item do catálogo."""
    nome: Optional[str] = Field(None, min_length=2, max_length=300)
    tipo: Optional[str] = Field(None, pattern="^(PRODUTO|SERVICO)$")


class CatalogoProdutoResponse(BaseModel):
    """Resposta pública de um item do catálogo."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    tipo: str
    criado_em: datetime
    atualizado_em: datetime


class CatalogoProdutoEnrichedResponse(BaseModel):
    """Resposta enriquecida com dados de relacionamento."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    tipo: str
    criado_em: datetime
    atualizado_em: datetime

    # Dados calculados
    fornecedores_vinculados: list[str] = []
    ja_contratado: bool = False
    fornecedores_contratados: list[str] = []
