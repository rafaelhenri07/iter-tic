"""
ITER TIC — Pydantic Schemas: Empresa

Schemas de criação, atualização e respostas para o módulo de Empresas.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CREATE / UPDATE                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class EmpresaCreate(BaseModel):
    """Payload para criação de uma empresa."""

    nome: str = Field(..., min_length=2, max_length=300)
    cnpj: Optional[str] = Field(None, max_length=18, examples=["00.000.000/0000-00"])
    site: Optional[str] = Field(None, max_length=300)

    # Contato
    contato_nome: Optional[str] = Field(None, max_length=150)
    telefones: list[str] = Field(
        default_factory=list,
        description="Lista de telefones no formato (XX) XXXXX-XXXX.",
    )
    email: Optional[str] = Field(None, max_length=200)

    # Portfólio
    servicos_ofertados: list[str] = Field(
        default_factory=list,
        description="Lista de tags de serviços ofertados.",
    )


class EmpresaUpdate(BaseModel):
    """Payload para atualização parcial de uma empresa."""

    nome: Optional[str] = Field(None, min_length=2, max_length=300)
    cnpj: Optional[str] = Field(None, min_length=14, max_length=18)
    site: Optional[str] = Field(None, max_length=300)

    contato_nome: Optional[str] = Field(None, min_length=2, max_length=150)
    telefones: Optional[list[str]] = None
    email: Optional[str] = Field(None, max_length=200)

    servicos_ofertados: Optional[list[str]] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  RESPONSE                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class EmpresaResponse(BaseModel):
    """Representação pública completa de uma empresa."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    cnpj: Optional[str] = None
    site: Optional[str] = None

    contato_nome: Optional[str] = None
    telefones: list[str] = []
    email: Optional[str] = None

    servicos_ofertados: list[str] = []

    create_time: datetime
    update_time: Optional[datetime] = None


class EmpresaResumo(BaseModel):
    """Resumo mínimo de empresa para uso em selects relacionais."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    cnpj: str
