"""
ITER TIC - Modelos SQLAlchemy V2 do Módulo 3: Execução e Fiscalização (Contratos)

Arquitetura:
  - Um Contrato nasce de um Projeto com status 'Licitação concluída'.
  - Cada Contrato possui uma equipe de fiscalização (Gestor, Fiscal
    Requisitante, Fiscal Técnico, Fiscal Administrativo), referenciando
    a tabela Servidor.
  - Campos financeiros segregados em Investimento e Custeio conforme
    a natureza de despesa orçamentária.
"""

from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ENUMS DO MÓDULO 3                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class TipoContratoEnum(str, enum.Enum):
    """Classificação do tipo de contratação."""
    AQUISICAO = "Aquisição"
    SERVICO_CONTINUADO = "Serviço continuado"
    SUBSCRICAO = "Subscrição"


class SituacaoContratoEnum(str, enum.Enum):
    """Situação atual do contrato na instituição."""
    VIGENTE = "Vigente"
    EXTINTO = "Extinto"
    EXTINTO_SUPORTE_VIGENTE = "Extinto, mas suporte vigente"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO (entidade central do Módulo 3)                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class Contrato(Base):
    __tablename__ = "contratos"

    # ── Identificação ───────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_contrato: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True,
        comment="Número do contrato no formato NN/YYYY.",
    )

    # ── Vínculo com Projeto ─────────────────────────────────────────────────
    projeto_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projetos.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Projeto de origem (deve ter status 'Licitação concluída').",
    )

    # ── Dados da Contratação ────────────────────────────────────────────────
    empresa_contratada: Mapped[str] = mapped_column(
        String(500), nullable=False,
        comment="Razão social da empresa contratada.",
    )
    fabricante: Mapped[Optional[str]] = mapped_column(
        String(300), nullable=True,
        comment="Fabricante do produto/solução, se aplicável.",
    )
    tipo_contrato: Mapped[TipoContratoEnum] = mapped_column(
        Enum(
            TipoContratoEnum,
            name="tipo_contrato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    quantidade: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Quantidade de itens/licenças/unidades contratadas.",
    )
    tecnologia_utilizada: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True,
        comment="Descrição livre da tecnologia contratada.",
    )

    # ── Valores Financeiros ─────────────────────────────────────────────────
    valor_investimento: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="Valor de investimento (CAPEX).",
    )
    valor_custeio: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="Valor de custeio (OPEX).",
    )

    # ── Vigência ────────────────────────────────────────────────────────────
    prazo: Mapped[Optional[str]] = mapped_column(
        String(300), nullable=True,
        comment="Descrição do prazo (ex: '12 meses; 24 meses com suporte').",
    )
    data_assinatura: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Data de assinatura do contrato.",
    )
    data_fim_vigencia: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Data de encerramento da vigência.",
    )

    # ── Situação ────────────────────────────────────────────────────────────
    situacao_atual: Mapped[SituacaoContratoEnum] = mapped_column(
        Enum(
            SituacaoContratoEnum,
            name="situacao_contrato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=SituacaoContratoEnum.VIGENTE,
    )
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Equipe de Fiscalização (FKs para Servidor) ──────────────────────────
    gestor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Gestor do contrato.",
    )
    fiscal_requisitante_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Fiscal requisitante do contrato.",
    )
    fiscal_tecnico_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Fiscal técnico do contrato.",
    )
    fiscal_administrativo_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Fiscal administrativo do contrato.",
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
    projeto: Mapped["Projeto"] = relationship("Projeto", lazy="selectin")

    gestor: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[gestor_id],
    )
    fiscal_requisitante: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[fiscal_requisitante_id],
    )
    fiscal_tecnico: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[fiscal_tecnico_id],
    )
    fiscal_administrativo: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[fiscal_administrativo_id],
    )

    # Histórico / Auditoria (1:N)
    historico: Mapped[list["ContratoHistorico"]] = relationship(
        "ContratoHistorico",
        back_populates="contrato",
        order_by="desc(ContratoHistorico.data_hora)",
        lazy="selectin",
    )

    # ── Constraints ─────────────────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("numero_contrato", name="uq_contrato_numero"),
    )

    @property
    def valor_total(self) -> Decimal:
        """Soma de investimento + custeio."""
        return (self.valor_investimento or Decimal(0)) + (self.valor_custeio or Decimal(0))

    def __repr__(self) -> str:
        return f"<Contrato #{self.id} {self.numero_contrato} situacao={self.situacao_atual.value}>"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CONTRATO HISTÓRICO (Log de Auditoria e Observações)                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class TipoRegistroHistoricoEnum(str, enum.Enum):
    """Tipo de registro no histórico do contrato."""
    EDICAO_SISTEMA = "Edição de Sistema"
    OBSERVACAO_MANUAL = "Observação Manual"


class ContratoHistorico(Base):
    __tablename__ = "contrato_historico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contrato_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contratos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    autor: Mapped[str] = mapped_column(
        String(200), nullable=False, default="Usuário do Sistema",
        comment="Autor da ação (temporário até JWT).",
    )
    tipo_registro: Mapped[TipoRegistroHistoricoEnum] = mapped_column(
        Enum(
            TipoRegistroHistoricoEnum,
            name="tipo_registro_historico_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    conteudo: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Descrição da mudança ou texto da observação.",
    )

    # ── Relationships ──────────────────────────────────────────────────────
    contrato: Mapped["Contrato"] = relationship(
        "Contrato", back_populates="historico",
    )

    def __repr__(self) -> str:
        return f"<ContratoHistorico #{self.id} tipo={self.tipo_registro.value}>"


# ── Forward reference imports ──────────────────────────────────────────────
from app.models.projeto import Projeto, Servidor  # noqa: E402, F401
