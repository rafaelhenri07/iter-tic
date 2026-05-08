"""
ITER TIC — Pydantic Schemas: Fabricante

Schemas de criação, atualização e respostas para o módulo de Fabricantes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CREATE / UPDATE                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class FabricanteCreate(BaseModel):
    """Payload para criação de um fabricante."""
    nome: str
    site: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_cargo: Optional[str] = None
    contato_telefone1: Optional[str] = None
    contato_telefone2: Optional[str] = None
    contato_email: Optional[str] = None


class FabricanteUpdate(BaseModel):
    """Payload para atualização parcial de um fabricante."""
    nome: Optional[str] = None
    site: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_cargo: Optional[str] = None
    contato_telefone1: Optional[str] = None
    contato_telefone2: Optional[str] = None
    contato_email: Optional[str] = None


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  RESPONSE                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class FabricanteResponse(BaseModel):
    """Representação pública de um fabricante."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    site: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_cargo: Optional[str] = None
    contato_telefone1: Optional[str] = None
    contato_telefone2: Optional[str] = None
    contato_email: Optional[str] = None
    create_time: datetime
    update_time: Optional[datetime] = None
