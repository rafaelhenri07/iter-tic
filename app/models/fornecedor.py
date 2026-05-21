"""
ITER TIC — Modelo SQLAlchemy V2: Fornecedor

Entidade unificada que consolida os antigos módulos de "Empresas" e
"Fabricantes". Suporta Pessoa Física e Pessoa Jurídica com contatos
dinâmicos (JSONB) e portfólio N:N via CatalogoProduto.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Table,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ENUMS                                                                 ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class NaturezaFornecedorEnum(str, enum.Enum):
    """Natureza jurídica do fornecedor."""
    PESSOA_FISICA = "PESSOA_FISICA"
    PESSOA_JURIDICA = "PESSOA_JURIDICA"


class TipoFornecedorContratoEnum(str, enum.Enum):
    """Tipo de atuação do fornecedor no contrato."""
    REVENDEDOR = "REVENDEDOR"
    FABRICANTE = "FABRICANTE"
    REVENDEDOR_E_FABRICANTE = "REVENDEDOR_E_FABRICANTE"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  TABELA ASSOCIATIVA: Fornecedor ↔ CatalogoProduto (N:N)               ║
# ╚══════════════════════════════════════════════════════════════════════════╝

fornecedor_catalogo = Table(
    "fornecedor_catalogo",
    Base.metadata,
    Column(
        "fornecedor_id",
        Integer,
        ForeignKey("fornecedores.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "catalogo_produto_id",
        Integer,
        ForeignKey("catalogo_produtos.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  FORNECEDOR                                                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class Fornecedor(Base):
    """Fornecedor unificado de soluções/serviços de TI."""

    __tablename__ = "fornecedores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── Dados do fornecedor ───────────────────────────────────────────────
    nome: Mapped[str] = mapped_column(
        String(300), nullable=False, index=True,
    )
    natureza: Mapped[NaturezaFornecedorEnum] = mapped_column(
        Enum(
            NaturezaFornecedorEnum,
            name="natureza_fornecedor_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        comment="Pessoa Física ou Pessoa Jurídica.",
    )
    documento: Mapped[Optional[str]] = mapped_column(
        String(18), nullable=True, index=True,
        comment="CPF (PF) ou CNPJ (PJ).",
    )
    site: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    telefone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── Contatos dinâmicos (JSONB) ────────────────────────────────────────
    contatos: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, default=list,
        comment="Lista de {nome, telefone, email, cargo}.",
    )

    # ── Portfólio (N:N com CatalogoProduto) ───────────────────────────────
    portfolio: Mapped[list["CatalogoProduto"]] = relationship(
        "CatalogoProduto",
        secondary=fornecedor_catalogo,
        lazy="selectin",
    )

    # ── Auditoria (Soft Delete) ──────────────────────────────────────────
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )
    delete_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false",
    )

    def __repr__(self) -> str:
        return f"<Fornecedor #{self.id} {self.nome} ({self.natureza.value})>"


# ── Forward reference ─────────────────────────────────────────────────────
from app.models.catalogo import CatalogoProduto  # noqa: E402, F401
