"""
ITER TIC - Modelo SQLAlchemy: Estrutura Organizacional (Unificada)

Uma única tabela "unidade_organizacional" serve como fonte de verdade
para Departamentos, Unidades Demandantes e Unidades Responsáveis,
eliminando duplicação de cadastro.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

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

    def __repr__(self) -> str:
        return f"<UnidadeOrganizacional #{self.id} {self.sigla or self.nome}>"
