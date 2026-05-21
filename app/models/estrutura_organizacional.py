"""
ITER TIC - Modelo SQLAlchemy: Estrutura Organizacional (Unificada)

Uma única tabela "unidade_organizacional" serve como fonte de verdade
para Departamentos, Unidades Demandantes e Unidades Responsáveis,
eliminando duplicação de cadastro.

Suporta hierarquia autorreferenciada (parent-child) com infinitos
níveis de profundidade para organogramas governamentais complexos.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UnidadeOrganizacional(Base):
    """Entidade unificada para qualquer unidade do organograma."""
    __tablename__ = "unidades_organizacionais"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    sigla: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Hierarquia autorreferenciada ──────────────────────────────────────
    unidade_pai_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("unidades_organizacionais.id"), nullable=True
    )

    unidade_pai: Mapped[Optional["UnidadeOrganizacional"]] = relationship(
        "UnidadeOrganizacional",
        remote_side=[id],
        back_populates="subunidades",
        lazy="selectin",
    )

    subunidades: Mapped[List["UnidadeOrganizacional"]] = relationship(
        "UnidadeOrganizacional",
        back_populates="unidade_pai",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ── Propriedade calculada ─────────────────────────────────────────────
    @property
    def caminho_completo(self) -> str:
        """Retorna o caminho hierárquico completo (ex: 'PCDF / DGI / DITEC')."""
        partes: list[str] = []
        atual: Optional[UnidadeOrganizacional] = self
        while atual is not None:
            partes.append(atual.sigla or atual.nome)
            atual = atual.unidade_pai
        partes.reverse()
        return " / ".join(partes)

    def __repr__(self) -> str:
        return f"<UnidadeOrganizacional #{self.id} {self.sigla or self.nome}>"
