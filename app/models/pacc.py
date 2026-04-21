"""
ITER TIC - Modelos SQLAlchemy V2 do módulo PACC (Plano Anual de Contratações)

Arquitetura de rastreabilidade (SCD — mesmo padrão do PDTIC):
  - Cada ItemPacc possui `revisao_inclusao_id` (quando foi criado/revisado)
    e `revisao_exclusao_id` (quando foi logicamente removido).
  - Alterações em um item geram uma nova linha com `item_pai_id` apontando
    para a versão anterior, preservando histórico completo.
  - Cada item vincula-se a uma AcaoPdtic específica, garantindo
    rastreabilidade ponta-a-ponta entre planejamento plurianual e contratações.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# 1. Exercício do PACC  (ex: 2024, 2025)
# ---------------------------------------------------------------------------
class ExercicioPacc(Base):
    __tablename__ = "pacc_exercicios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ----- timestamps -----
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ----- relationships -----
    revisoes: Mapped[list["RevisaoPacc"]] = relationship(
        back_populates="exercicio",
        cascade="all, delete-orphan",
        order_by="RevisaoPacc.numero_revisao",
    )
    itens: Mapped[list["ItemPacc"]] = relationship(
        back_populates="exercicio",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("ano >= 2000 AND ano <= 2100", name="ck_exercicio_ano_range"),
    )

    def __repr__(self) -> str:
        return f"<ExercicioPacc ano={self.ano} ativo={self.ativo}>"


# ---------------------------------------------------------------------------
# 2. Revisão do PACC  (Rev 1, Rev 2, …)
# ---------------------------------------------------------------------------
class RevisaoPacc(Base):
    __tablename__ = "pacc_revisoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exercicio_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pacc_exercicios.id", ondelete="CASCADE"),
        nullable=False,
    )
    numero_revisao: Mapped[int] = mapped_column(Integer, nullable=False)
    data_aprovacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ----- timestamps -----
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ----- relationships -----
    exercicio: Mapped["ExercicioPacc"] = relationship(back_populates="revisoes")

    itens_incluidos: Mapped[list["ItemPacc"]] = relationship(
        foreign_keys="ItemPacc.revisao_inclusao_id",
        back_populates="revisao_inclusao",
    )
    itens_excluidos: Mapped[list["ItemPacc"]] = relationship(
        foreign_keys="ItemPacc.revisao_exclusao_id",
        back_populates="revisao_exclusao",
    )

    __table_args__ = (
        UniqueConstraint(
            "exercicio_id", "numero_revisao", name="uq_revisao_pacc_por_exercicio"
        ),
    )

    def __repr__(self) -> str:
        return f"<RevisaoPacc Rev {self.numero_revisao} exercicio_id={self.exercicio_id}>"


# ---------------------------------------------------------------------------
# 3. Item do PACC (tabela principal com rastreabilidade por revisão)
# ---------------------------------------------------------------------------
class ItemPacc(Base):
    __tablename__ = "pacc_itens"

    # ── Identificação ───────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_item: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="Número sequencial do item (ex: 1, 2, 3)"
    )

    # ── Relacionamentos do ciclo de vida ────────────────────────────────────
    exercicio_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pacc_exercicios.id", ondelete="CASCADE"),
        nullable=False,
    )
    revisao_inclusao_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pacc_revisoes.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Revisão em que esta versão do item foi criada/introduzida.",
    )
    revisao_exclusao_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("pacc_revisoes.id", ondelete="RESTRICT"),
        nullable=True,
        comment="Revisão em que este item foi logicamente excluído.",
    )
    item_pai_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("pacc_itens.id", ondelete="SET NULL"),
        nullable=True,
        comment="Aponta para a versão anterior quando este item é uma revisão de outro.",
    )

    # ── Vínculo com PDTIC ───────────────────────────────────────────────────
    acao_pdtic_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pdtic_acoes.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Ação do PDTIC à qual este item de contratação está vinculado.",
    )

    # ── Campos de negócio ───────────────────────────────────────────────────
    descricao_demanda: Mapped[str] = mapped_column(Text, nullable=False)
    quantidade: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment='Quantidade estimada (ex: "1", "200", "diversos")',
    )
    valor_estimado: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
        comment="Valor estimado da contratação em R$",
    )
    processo_sei: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment='Números dos processos SEI (ex: "00052-00032300/2024-09")',
    )

    # ── Timestamps ──────────────────────────────────────────────────────────
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ───────────────────────────────────────────────────────
    exercicio: Mapped["ExercicioPacc"] = relationship(back_populates="itens")
    revisao_inclusao: Mapped["RevisaoPacc"] = relationship(
        foreign_keys=[revisao_inclusao_id],
        back_populates="itens_incluidos",
    )
    revisao_exclusao: Mapped[Optional["RevisaoPacc"]] = relationship(
        foreign_keys=[revisao_exclusao_id],
        back_populates="itens_excluidos",
    )
    item_pai: Mapped[Optional["ItemPacc"]] = relationship(
        remote_side=[id],
        foreign_keys=[item_pai_id],
    )

    # Vínculo bidirecional com AcaoPdtic
    acao_pdtic: Mapped["AcaoPdtic"] = relationship(
        "AcaoPdtic",
        foreign_keys=[acao_pdtic_id],
        back_populates="itens_pacc",
    )

    # ── Constraints ─────────────────────────────────────────────────────────
    __table_args__ = (
        CheckConstraint(
            "valor_estimado >= 0",
            name="ck_item_valor_estimado_positivo",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ItemPacc #{self.numero_item} "
            f"rev_in={self.revisao_inclusao_id} "
            f"rev_out={self.revisao_exclusao_id}>"
        )

    @property
    def esta_ativo(self) -> bool:
        """Retorna True se o item não foi excluído em nenhuma revisão."""
        return self.revisao_exclusao_id is None
