"""
ITER TIC — Pydantic Schemas: Fornecedor
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.fornecedor import NaturezaFornecedorEnum
from app.schemas.catalogo import CatalogoProdutoResponse


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SUB-SCHEMAS                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContatoFornecedor(BaseModel):
    """Um contato individual do fornecedor."""
    nome: str = Field(..., min_length=1, max_length=150)
    telefone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=200)
    cargo: Optional[str] = Field(None, max_length=100)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CREATE / UPDATE                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class FornecedorCreate(BaseModel):
    """Payload para criação de um fornecedor."""
    nome: str = Field(..., min_length=2, max_length=300)
    natureza: NaturezaFornecedorEnum
    documento: Optional[str] = Field(None, max_length=18)
    site: Optional[str] = Field(None, max_length=300)
    email: Optional[str] = Field(None, max_length=200)
    telefone: Optional[str] = Field(None, max_length=50)
    contatos: list[ContatoFornecedor] = Field(default_factory=list)
    portfolio_ids: list[int] = Field(default_factory=list)


class FornecedorUpdate(BaseModel):
    """Payload para atualização parcial de um fornecedor."""
    nome: Optional[str] = Field(None, min_length=2, max_length=300)
    natureza: Optional[NaturezaFornecedorEnum] = None
    documento: Optional[str] = Field(None, max_length=18)
    site: Optional[str] = Field(None, max_length=300)
    email: Optional[str] = Field(None, max_length=200)
    telefone: Optional[str] = Field(None, max_length=50)
    contatos: Optional[list[ContatoFornecedor]] = None
    portfolio_ids: Optional[list[int]] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  RESPONSE                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class FornecedorResponse(BaseModel):
    """Resposta pública completa de um fornecedor."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    natureza: NaturezaFornecedorEnum
    documento: Optional[str] = None
    site: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    contatos: list[ContatoFornecedor] = []
    portfolio: list[CatalogoProdutoResponse] = []
    criado_em: datetime
    atualizado_em: datetime


class FornecedorResumo(BaseModel):
    """Resumo mínimo de fornecedor para uso em selects."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    documento: Optional[str] = None
    natureza: NaturezaFornecedorEnum
