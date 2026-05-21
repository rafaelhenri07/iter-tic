"""
ITER TIC - Modelos SQLAlchemy V2 do módulo PDTIC (Planejamento Estratégico)

Arquitetura de rastreabilidade:
  - Cada AcaoPdtic possui `revisao_inclusao_id` (quando foi criada/revisada)
    e `revisao_exclusao_id` (quando foi logicamente removida).
  - No caso de alteração de uma ação, uma nova linha é inserida com
    `acao_pai_id` apontando para a versão anterior, garantindo histórico
    completo sem perda de dados ("append-only" por revisão).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    CheckConstraint,
    UniqueConstraint,
    func,
    Table,
    Column,
)
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import StatusAcaoEnum
from app.models.estrutura_organizacional import UnidadeOrganizacional


# ---------------------------------------------------------------------------
# 1. Período do PDTIC  (ex: 2024-2027)
# ---------------------------------------------------------------------------
class PeriodoPdtic(Base):
    __tablename__ = "pdtic_periodos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ano_inicio: Mapped[int] = mapped_column(Integer, nullable=False)
    ano_fim: Mapped[int] = mapped_column(Integer, nullable=False)
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
    revisoes: Mapped[list["RevisaoPdtic"]] = relationship(
        back_populates="periodo",
        cascade="all, delete-orphan",
        order_by="RevisaoPdtic.numero_revisao",
    )
    acoes: Mapped[list["AcaoPdtic"]] = relationship(
        back_populates="periodo",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("ano_fim > ano_inicio", name="ck_periodo_anos"),
        UniqueConstraint("ano_inicio", "ano_fim", name="uq_periodo_intervalo"),
    )

    def __repr__(self) -> str:
        return f"<PeriodoPdtic {self.ano_inicio}-{self.ano_fim} ativo={self.ativo}>"


# ---------------------------------------------------------------------------
# 2. Revisão do PDTIC  (Rev 1, Rev 2, …)
# ---------------------------------------------------------------------------
class RevisaoPdtic(Base):
    __tablename__ = "pdtic_revisoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    periodo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pdtic_periodos.id", ondelete="CASCADE"), nullable=False
    )
    numero_revisao: Mapped[int] = mapped_column(Integer, nullable=False)
    data_aprovacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ----- timestamps -----
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ----- relationships -----
    periodo: Mapped["PeriodoPdtic"] = relationship(back_populates="revisoes")

    acoes_incluidas: Mapped[list["AcaoPdtic"]] = relationship(
        foreign_keys="AcaoPdtic.revisao_inclusao_id",
        back_populates="revisao_inclusao",
    )
    acoes_excluidas: Mapped[list["AcaoPdtic"]] = relationship(
        foreign_keys="AcaoPdtic.revisao_exclusao_id",
        back_populates="revisao_exclusao",
    )

    __table_args__ = (
        UniqueConstraint(
            "periodo_id", "numero_revisao", name="uq_revisao_por_periodo"
        ),
    )

    def __repr__(self) -> str:
        return f"<RevisaoPdtic Rev {self.numero_revisao} periodo_id={self.periodo_id}>"


# ---------------------------------------------------------------------------
# Tabelas de Associação (Many-to-Many)
# ---------------------------------------------------------------------------
pdtic_departamento_assoc = Table(
    "pdtic_departamento",
    Base.metadata,
    Column("acao_pdtic_id", Integer, ForeignKey("pdtic_acoes.id", ondelete="CASCADE"), primary_key=True),
    Column("unidade_org_id", Integer, ForeignKey("unidades_organizacionais.id", ondelete="CASCADE"), primary_key=True),
)

pdtic_unidade_demandante_assoc = Table(
    "pdtic_unidade_demandante",
    Base.metadata,
    Column("acao_pdtic_id", Integer, ForeignKey("pdtic_acoes.id", ondelete="CASCADE"), primary_key=True),
    Column("unidade_org_id", Integer, ForeignKey("unidades_organizacionais.id", ondelete="CASCADE"), primary_key=True),
)

pdtic_unidade_responsavel_assoc = Table(
    "pdtic_unidade_responsavel",
    Base.metadata,
    Column("acao_pdtic_id", Integer, ForeignKey("pdtic_acoes.id", ondelete="CASCADE"), primary_key=True),
    Column("unidade_org_id", Integer, ForeignKey("unidades_organizacionais.id", ondelete="CASCADE"), primary_key=True),
)

# ---------------------------------------------------------------------------
# 3. Ação do PDTIC (tabela principal com rastreabilidade por revisão)
# ---------------------------------------------------------------------------
class AcaoPdtic(Base):
    __tablename__ = "pdtic_acoes"

    # ── Identificação ───────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_acao: Mapped[str] = mapped_column(String(20), nullable=False)

    # ── Relacionamentos do ciclo de vida ────────────────────────────────────
    periodo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pdtic_periodos.id", ondelete="CASCADE"), nullable=False
    )
    revisao_inclusao_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pdtic_revisoes.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Revisão em que esta versão da ação foi criada/introduzida.",
    )
    revisao_exclusao_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("pdtic_revisoes.id", ondelete="RESTRICT"),
        nullable=True,
        comment="Revisão em que esta ação foi logicamente excluída.",
    )
    acao_pai_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("pdtic_acoes.id", ondelete="SET NULL"),
        nullable=True,
        comment="Aponta para a versão anterior quando esta ação é uma revisão de outra.",
    )

    # ── Campos de negócio (strings legadas — mantidas por compatibilidade) ──
    departamento: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    unidade_demandante: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    unidade_responsavel: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # As colunas singulares de FK para estrutura organizacional foram removidas para dar lugar às tabelas N:N.

    necessidade: Mapped[str] = mapped_column(String(20), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)

    tipo_necessidade: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        nullable=False,
        comment="Lista de tipos de necessidade: hardware, software, servico, etc.",
    )
    status: Mapped[StatusAcaoEnum] = mapped_column(
        Enum(
            StatusAcaoEnum,
            name="status_acao_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=StatusAcaoEnum.NAO_INICIADA,
    )

    meta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    indicador: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantidade: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    total_gut: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    previsao_contratacao: Mapped[Optional[str]] = mapped_column(
        String(7),
        nullable=True,
        comment="Data prevista (ISO: YYYY-MM)",
    )
    previsao_renovacao: Mapped[Optional[str]] = mapped_column(
        String(7),
        nullable=True,
        comment="Data prevista (ISO: YYYY-MM)",
    )

    # ── Valores financeiros por ano (JSONB) ─────────────────────────────────
    valores_investimento: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict,
        comment='Ex: {"2024": 100000.00, "2025": 50000.00}',
    )
    valores_custeio: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict,
        comment='Ex: {"2024": 30000.00}',
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
    periodo: Mapped["PeriodoPdtic"] = relationship(back_populates="acoes")
    revisao_inclusao: Mapped["RevisaoPdtic"] = relationship(
        foreign_keys=[revisao_inclusao_id],
        back_populates="acoes_incluidas",
    )
    revisao_exclusao: Mapped[Optional["RevisaoPdtic"]] = relationship(
        foreign_keys=[revisao_exclusao_id],
        back_populates="acoes_excluidas",
    )
    acao_pai: Mapped[Optional["AcaoPdtic"]] = relationship(
        remote_side=[id],
        foreign_keys=[acao_pai_id],
    )

    # Vínculo reverso com itens do PACC
    itens_pacc: Mapped[list["ItemPacc"]] = relationship(
        "ItemPacc",
        foreign_keys="ItemPacc.acao_pdtic_id",
        back_populates="acao_pdtic",
    )

    # Relacionamentos com Estrutura Organizacional (N:N — tabela unificada)
    departamentos_rel: Mapped[list["UnidadeOrganizacional"]] = relationship(
        "UnidadeOrganizacional", secondary=pdtic_departamento_assoc, lazy="selectin",
    )
    unidades_demandantes_rel: Mapped[list["UnidadeOrganizacional"]] = relationship(
        "UnidadeOrganizacional", secondary=pdtic_unidade_demandante_assoc, lazy="selectin",
    )
    unidades_responsaveis_rel: Mapped[list["UnidadeOrganizacional"]] = relationship(
        "UnidadeOrganizacional", secondary=pdtic_unidade_responsavel_assoc, lazy="selectin",
    )

    # ── Constraints ─────────────────────────────────────────────────────────
    __table_args__ = (
        CheckConstraint(
            "total_gut >= 0 AND total_gut <= 125",
            name="ck_acao_total_gut_range",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<AcaoPdtic {self.codigo_acao} "
            f"rev_in={self.revisao_inclusao_id} "
            f"rev_out={self.revisao_exclusao_id}>"
        )

    @property
    def esta_ativa(self) -> bool:
        """Retorna True se a ação não foi excluída em nenhuma revisão."""
        return self.revisao_exclusao_id is None

    @property
    def departamentos_ids(self) -> list[int]:
        return [u.id for u in self.departamentos_rel]

    @property
    def unidades_demandantes_ids(self) -> list[int]:
        return [u.id for u in self.unidades_demandantes_rel]

    @property
    def unidades_responsaveis_ids(self) -> list[int]:
        return [u.id for u in self.unidades_responsaveis_rel]


