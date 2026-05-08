"""
ITER TIC - Modelo SQLAlchemy do Módulo 3: Aditivos de Prazo

Cada Aditivo registra uma prorrogação de vigência de um Contrato.
Ao criar um Aditivo, a lógica de negócio atualiza automaticamente
a `data_fim_vigencia` do Contrato pai.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.contrato import Contrato


class Aditivo(Base):
    """Termo Aditivo de prazo vinculado a um Contrato."""

    __tablename__ = "aditivos"

    # ── Identificação ────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ── Vínculo com Contrato ─────────────────────────────────────────────────
    contrato_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contratos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Contrato ao qual este aditivo pertence.",
    )

    # ── Dados do Aditivo ─────────────────────────────────────────────────────
    numero_aditivo: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Identificação do aditivo (ex: '1º Termo Aditivo').",
    )
    data_inicio_vigencia: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Data de início da nova vigência estabelecida pelo aditivo.",
    )
    data_fim_vigencia: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Nova data de fim de vigência após o aditivo.",
    )

    # ── Timestamps ───────────────────────────────────────────────────────────
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    # ── Relationships ────────────────────────────────────────────────────────
    contrato: Mapped["Contrato"] = relationship("Contrato", back_populates="aditivos")

    def __repr__(self) -> str:
        return (
            f"<Aditivo #{self.id} contrato={self.contrato_id} "
            f"'{self.numero_aditivo}' fim={self.data_fim_vigencia}>"
        )
