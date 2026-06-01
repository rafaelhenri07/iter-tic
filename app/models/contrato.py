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


class ComplexidadeContratoEnum(str, enum.Enum):
    """Complexidade do contrato."""
    SIMPLES = "simples"
    INTERMEDIARIA = "intermediaria"
    COMPLEXA = "complexa"



class SituacaoContratoEnum(str, enum.Enum):
    """Situação atual do contrato na instituição."""
    VIGENTE = "Vigente"
    VIGENTE_SUSPENSO = "Vigente com execução suspensa"
    VIGENTE_PRORROGADO = "Vigente prorrogado"
    EXTINTO = "Extinto"
    EXTINTO_OBRIGACOES = "contrato extinto com obrigações remanescentes"


class ModalidadeContratoEnum(str, enum.Enum):
    """Modalidade da contratação."""
    CONTRATO = "CONTRATO"
    ARP = "ARP"


class TipoInstrumentoEnum(str, enum.Enum):
    """Tipo de instrumento contratual (apenas para modalidade CONTRATO)."""
    CONTRATO = "CONTRATO"
    NOTA_EMPENHO = "NOTA_EMPENHO"


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
    numero: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # ── Modalidade ───────────────────────────────────────────────────────────
    modalidade_contrato: Mapped[ModalidadeContratoEnum] = mapped_column(
        Enum(
            ModalidadeContratoEnum,
            name="modalidade_contrato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=ModalidadeContratoEnum.CONTRATO,
        server_default="CONTRATO",
        index=True,
        comment="Modalidade: CONTRATO ou ARP.",
    )
    orgao_gerenciador: Mapped[Optional[str]] = mapped_column(
        String(300), nullable=True,
        comment="Órgão gerenciador da ARP (somente para modalidade ARP).",
    )
    tipo_instrumento: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        comment="Tipo de instrumento: CONTRATO ou NOTA_EMPENHO (somente para modalidade CONTRATO).",
    )
    tipo_contratacao: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="Tipo de contratação (ex: Dispensa, Inexigibilidade, Pregão, etc.).",
    )


    # ── Vínculo com Projeto ─────────────────────────────────────────────────
    projeto_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projetos.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Projeto de origem (deve ter status 'Licitação concluída').",
    )

    # ── Dados da Contratação ────────────────────────────────────────────────
    fornecedor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("fornecedores.id", ondelete="RESTRICT"),
        nullable=True,
        comment="Fornecedor vinculado ao contrato (FK para fornecedores).",
    )
    tipo_fornecedor_contrato: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True,
        comment="Tipo: REVENDEDOR, FABRICANTE ou REVENDEDOR_E_FABRICANTE.",
    )
    tipo_contrato: Mapped[TipoContratoEnum] = mapped_column(
        Enum(
            TipoContratoEnum,
            name="tipo_contrato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    # ── Itens da Contratação ────────────────────────────────────────────────
    itens: Mapped[list["ItemContrato"]] = relationship(
        "ItemContrato",
        back_populates="contrato",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ── Vigência ────────────────────────────────────────────────────────────
    data_inicio_vigencia: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Data de início da vigência (pode diferir da assinatura).",
    )
    vigencia_meses: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        comment="Quantidade de meses de vigência original (calculado automaticamente).",
    )
    prorrogacao_meses: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
        comment="Prorrogação total em meses acumulada via aditivos.",
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

    # ── Complexidade ────────────────────────────────────────────────────────
    complexidade: Mapped[ComplexidadeContratoEnum] = mapped_column(
        Enum(
            ComplexidadeContratoEnum,
            name="complexidade_contrato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=ComplexidadeContratoEnum.SIMPLES,
        server_default="simples",
        comment="Complexidade do contrato: simples, intermediaria ou complexa.",
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

    fornecedor_rel: Mapped[Optional["Fornecedor"]] = relationship(
        "Fornecedor", foreign_keys=[fornecedor_id], lazy="selectin",
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

    # Aditivos de Prazo (1:N)
    aditivos: Mapped[list["Aditivo"]] = relationship(
        "Aditivo",
        back_populates="contrato",
        cascade="all, delete-orphan",
        order_by="Aditivo.data_fim_vigencia.desc()",
        lazy="selectin",
    )

    # ── Constraints ─────────────────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("numero", "ano", name="uq_contrato_numero_ano"),
    )

    @property
    def valor_total(self) -> Decimal:
        """Soma do valor total de todos os itens do contrato."""
        return sum((item.valor_total for item in self.itens), Decimal(0))

    def __repr__(self) -> str:
        return f"<Contrato #{self.id} {self.numero}/{self.ano} situacao={self.situacao_atual.value}>"


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
# ║  ITEM DE CONTRATO (Múltiplos produtos/serviços)                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ItemContrato(Base):
    __tablename__ = "item_contrato"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contrato_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contratos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    catalogo_produto_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("catalogo_produtos.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Referência ao item padronizado do Catálogo de Produtos/Serviços.",
    )

    quantidade: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1,
        comment="Quantidade de itens.",
    )
    valor_unitario: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0,
        comment="Valor unitário do item.",
    )

    # ── Catálogo Governamental (CATMAT ou CATSER) ──────────────────────────
    tipo_catalogo: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True,
        comment="Tipo de catálogo: 'CATMAT' (material) ou 'CATSER' (serviço).",
    )
    codigo_catalogo: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Código numérico do catálogo (ComprasNet).",
    )

    # ── Vigência Granular ──────────────────────────────────────────────────
    data_inicio_vigencia: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Data de início do suporte/garantia específico do item.",
    )
    data_fim_vigencia: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Data de fim do suporte/garantia específico do item.",
    )

    # ── Relationships ──────────────────────────────────────────────────────
    contrato: Mapped["Contrato"] = relationship("Contrato", back_populates="itens")
    catalogo_produto: Mapped[Optional["CatalogoProduto"]] = relationship("CatalogoProduto")

    @property
    def valor_total(self) -> Decimal:
        return Decimal(self.quantidade) * self.valor_unitario

    def __repr__(self) -> str:
        return f"<ItemContrato #{self.id} qtd={self.quantidade} valor_unitario={self.valor_unitario}>"


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
from app.models.fornecedor import Fornecedor  # noqa: E402, F401
from app.models.aditivo import Aditivo  # noqa: E402, F401
from app.models.catalogo import CatalogoProduto  # noqa: E402, F401
