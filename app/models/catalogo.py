"""
ITER TIC — Modelo SQLAlchemy V2: Catálogo de Produtos/Serviços

Dicionário oficial normalizado de produtos e serviços de TI.
Utilizado como portfólio dos Fornecedores (relação N:N).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CatalogoProduto(Base):
    """Produto ou serviço de TI padronizado no catálogo oficial."""

    __tablename__ = "catalogo_produtos"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(
        String(300), nullable=False, unique=True, index=True,
        comment="Nome do produto/serviço de TI.",
    )
    tipo: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="PRODUTO",
        comment="Tipo do item: PRODUTO ou SERVICO.",
    )

    # ── Timestamps ────────────────────────────────────────────────────────
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    def __repr__(self) -> str:
        return f"<CatalogoProduto #{self.id} {self.nome}>"
