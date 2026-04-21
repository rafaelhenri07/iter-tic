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


class PapelEquipeEnum(str, enum.Enum):
    """Papel de um servidor na equipe de fiscalização."""
    GESTOR = "gestor"
    FISCAL_REQUISITANTE = "fiscal_requisitante"
    FISCAL_TECNICO = "fiscal_tecnico"
    FISCAL_ADMINISTRATIVO = "fiscal_administrativo"


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
    fabricante_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("fabricantes.id", ondelete="SET NULL"),
        nullable=True,
        comment="Fabricante do produto/solução (FK para fabricantes).",
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

    fabricante_rel: Mapped[Optional["Fabricante"]] = relationship(
        "Fabricante", foreign_keys=[fabricante_id], lazy="selectin",
    )

    # Equipe de Fiscalização (1:N via tabela contrato_equipe)
    equipe_membros: Mapped[list["ContratoEquipe"]] = relationship(
        "ContratoEquipe",
        back_populates="contrato",
        cascade="all, delete-orphan",
        lazy="selectin",
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
# ║  CONTRATO EQUIPE (Tabela para Titular + Substitutos)                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ContratoEquipe(Base):
    """Membro da equipe de fiscalização de um contrato.
    Cada papel pode ter 1 Titular (is_titular=True) e N Substitutos.
    """
    __tablename__ = "contrato_equipe"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contrato_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contratos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    servidor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="CASCADE"),
        nullable=False,
    )
    papel: Mapped[PapelEquipeEnum] = mapped_column(
        Enum(
            PapelEquipeEnum,
            name="papel_equipe_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        comment="Papel do servidor na equipe.",
    )
    is_titular: Mapped[bool] = mapped_column(
        default=False,
        comment="True = Titular; False = Substituto.",
    )

    # ── Relationships ──────────────────────────────────────────────────────
    contrato: Mapped["Contrato"] = relationship("Contrato", back_populates="equipe_membros")
    servidor: Mapped["Servidor"] = relationship("Servidor", lazy="selectin")

    def __repr__(self) -> str:
        tipo = "Titular" if self.is_titular else "Substituto"
        return f"<ContratoEquipe #{self.id} papel={self.papel.value} {tipo}>"


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
from app.models.fabricante import Fabricante  # noqa: E402, F401
