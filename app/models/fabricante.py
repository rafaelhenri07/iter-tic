"""
ITER TIC — Modelo SQLAlchemy V2: Fabricante

Cadastro de fabricantes/fornecedores de soluções de TI.
Implementa soft-delete (is_deleted + delete_time) para manter
rastreabilidade histórica.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Fabricante(Base):
    """Fabricante / fornecedor de soluções de TI."""

    __tablename__ = "fabricantes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── Dados da empresa ─────────────────────────────────────────────────
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    site: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # ── Contato principal ────────────────────────────────────────────────
    contato_nome: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contato_cargo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contato_telefone1: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    contato_telefone2: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    contato_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Auditoria ────────────────────────────────────────────────────────
    create_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    update_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )
    delete_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
