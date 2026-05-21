"""
ITER TIC — Modelo SQLAlchemy V2: Empresa

Catálogo de fornecedores/empresas de TI.
Implementa soft-delete (is_deleted + delete_time) para manter
rastreabilidade histórica.

Serve como:
  1. Banco de prospecção de fornecedores.
  2. Fonte de dados para o campo empresa_id nos Contratos.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Empresa(Base):
    """Empresa fornecedora de soluções/serviços de TI."""

    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── Dados da empresa ─────────────────────────────────────────────────
    nome: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    cnpj: Mapped[Optional[str]] = mapped_column(
        String(18), nullable=True, unique=True, index=True,
        comment="CNPJ no formato 00.000.000/0000-00.",
    )
    site: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # ── Contato principal ────────────────────────────────────────────────
    contato_nome: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    telefones: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, default=list,
        comment="Lista de telefones de contato no formato (XX) XXXXX-XXXX.",
    )
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Portfólio de serviços ────────────────────────────────────────────
    servicos_ofertados: Mapped[Optional[list]] = mapped_column(
        JSON,
        nullable=True,
        default=list,
        comment="Lista de strings com os serviços ofertados pela empresa.",
    )

    # ── Auditoria (Soft Delete) ──────────────────────────────────────────
    create_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    update_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )
    delete_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    def __repr__(self) -> str:
        return f"<Empresa #{self.id} {self.nome}>"
