"""
ITER TIC - Modelos SQLAlchemy V2 do Módulo 2: Projetos e Licitações

Arquitetura:
  - Um Projeto consome dados do Módulo 1 (PDTIC e PACC) via tabelas
    associativas N:M (projeto_acao_pdtic, projeto_item_pacc).
  - Cada Projeto possui uma equipe (Integrante Requisitante, Técnico,
    Administrativo), referenciando a tabela Servidor.
  - Artefatos representam os documentos produzidos na fase interna
    da licitação (DFD, ETP, TR, etc.).
  - A tabela HistoricoDataArtefato garante compliance de auditoria:
    qualquer alteração em datas de artefatos exige justificativa e
    é registrada cronologicamente.
"""

from __future__ import annotations

import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ENUMS DO MÓDULO                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ComplexidadeProjetoEnum(str, enum.Enum):
    """Classificação da complexidade de um projeto de contratação."""
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


class StatusProjetoEnum(str, enum.Enum):
    """Status macro do projeto dentro do fluxo de contratação."""
    FASE_INTERNA = "Fase interna"
    FASE_EXTERNA = "Fase externa"
    CONTRATADO = "Contratado"


class TipoArtefatoEnum(str, enum.Enum):
    """Tipos de artefatos obrigatórios na fase interna da licitação."""
    DFD = "DFD"
    ETP = "ETP"
    MAPA_RISCOS = "Mapa de Riscos"
    ESTIMATIVA_CUSTOS = "Estimativa de Custos e Orçamento"
    TR = "TR"


class StatusArtefatoEnum(str, enum.Enum):
    """Status do ciclo de vida de um artefato."""
    NAO_INICIADO = "Não iniciado"
    INICIADO = "Iniciado"
    CONCLUIDO = "Concluído"


class TipoDataAlteradaEnum(str, enum.Enum):
    """Tipo de data alterada na auditoria de artefatos."""
    DATA_INICIO = "data_inicio"
    DATA_CONCLUSAO = "data_conclusao"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  TABELAS ASSOCIATIVAS (N:M)                                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝

projeto_acao_pdtic = Table(
    "projeto_acao_pdtic",
    Base.metadata,
    Column(
        "projeto_id",
        Integer,
        ForeignKey("projetos.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "acao_pdtic_id",
        Integer,
        ForeignKey("pdtic_acoes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

projeto_item_pacc = Table(
    "projeto_item_pacc",
    Base.metadata,
    Column(
        "projeto_id",
        Integer,
        ForeignKey("projetos.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "item_pacc_id",
        Integer,
        ForeignKey("pacc_itens.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  1. SERVIDOR (integrantes da equipe de planejamento)                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class Servidor(Base):
    __tablename__ = "servidores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    matricula: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True, index=True,
        comment="Matrícula funcional do servidor.",
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    cargo: Mapped[str] = mapped_column(String(200), nullable=False)
    funcao: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True,
        comment="Função comissionada ou de confiança, se houver.",
    )
    lotacao: Mapped[str] = mapped_column(
        String(200), nullable=False,
        comment="Unidade de lotação (ex: DTI, Gabinete).",
    )
    perfil_acesso: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="Perfil de acesso ao sistema (futuro RBAC).",
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

    def __repr__(self) -> str:
        return f"<Servidor {self.matricula} — {self.nome}>"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  2. PROJETO (entidade central do Módulo 2)                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class Projeto(Base):
    __tablename__ = "projetos"

    # ── Identificação ───────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(500), nullable=False)
    processo_sei: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True,
        comment="Número do processo SEI vinculado ao projeto.",
    )

    # ── Classificação ───────────────────────────────────────────────────────
    prioridade: Mapped[str] = mapped_column(
        String, nullable=False, server_default="media",
        comment="Prioridade: baixa, media, alta",
    )
    complexidade: Mapped[str] = mapped_column(
        String, nullable=False, default="Simples",
        comment="Complexidade: Simples, Intermediária ou Complexa",
    )
    catmat: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Código CATMAT (material) do ComprasNet.",
    )
    catser: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Código CATSER (serviço) do ComprasNet.",
    )

    # ── Status ──────────────────────────────────────────────────────────────
    status: Mapped[StatusProjetoEnum] = mapped_column(
        Enum(
            StatusProjetoEnum,
            name="status_projeto_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=StatusProjetoEnum.FASE_INTERNA,
    )

    # ── Equipe (FKs para Servidor) ──────────────────────────────────────────
    integrante_requisitante_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Integrante requisitante da equipe de planejamento.",
    )
    integrante_tecnico_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Integrante técnico da equipe de planejamento.",
    )
    integrante_administrativo_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Integrante administrativo da equipe de planejamento.",
    )

    # ── Fase Externa (Licitação) ─────────────────────────────────────────────
    data_envio_licitacao: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Data em que o projeto foi enviado para a área de licitação.",
    )
    situacao_licitacao_texto: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Descrição livre do andamento na área de compras/licitação.",
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

    # Equipe
    integrante_requisitante: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[integrante_requisitante_id],
    )
    integrante_tecnico: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[integrante_tecnico_id],
    )
    integrante_administrativo: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[integrante_administrativo_id],
    )

    # Vínculo com Planejamento Estratégico (N:M)
    acoes_pdtic: Mapped[list["AcaoPdtic"]] = relationship(
        "AcaoPdtic",
        secondary=projeto_acao_pdtic,
        lazy="selectin",
    )
    itens_pacc: Mapped[list["ItemPacc"]] = relationship(
        "ItemPacc",
        secondary=projeto_item_pacc,
        lazy="selectin",
    )

    # Artefatos do projeto (1:N)
    artefatos: Mapped[list["Artefato"]] = relationship(
        "Artefato",
        back_populates="projeto",
        cascade="all, delete-orphan",
        order_by="Artefato.id",
    )

    # Tramitações da fase externa (1:N)
    tramitacoes: Mapped[list["ProjetoTramitacao"]] = relationship(
        "ProjetoTramitacao",
        back_populates="projeto",
        cascade="all, delete-orphan",
        order_by="ProjetoTramitacao.data_hora.desc()",
    )

    # ── Constraints ─────────────────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("processo_sei", name="uq_projeto_processo_sei"),
    )

    def __repr__(self) -> str:
        return f"<Projeto #{self.id} SEI={self.processo_sei} status={self.status.value}>"

    @property
    def todos_artefatos_concluidos(self) -> bool:
        """Retorna True se TODOS os artefatos estão concluídos."""
        if not self.artefatos:
            return False
        return all(
            a.status == StatusArtefatoEnum.CONCLUIDO for a in self.artefatos
        )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  2b. PROJETO TRAMITAÇÃO (log da fase externa)                          ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ProjetoTramitacao(Base):
    __tablename__ = "projeto_tramitacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    projeto_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projetos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    observacao: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Descrição do andamento/tramitação na licitação.",
    )
    autor: Mapped[str] = mapped_column(
        String(200), nullable=False, default="Usuário do Sistema",
        comment="Autor da anotação (temporário até JWT).",
    )
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    # ── Relationships ───────────────────────────────────────────────────────
    projeto: Mapped["Projeto"] = relationship(back_populates="tramitacoes")

    def __repr__(self) -> str:
        return f"<ProjetoTramitacao #{self.id} projeto_id={self.projeto_id}>"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  3. ARTEFATO (documentos da fase interna da licitação)                 ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class Artefato(Base):
    __tablename__ = "artefatos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    projeto_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projetos.id", ondelete="CASCADE"),
        nullable=False,
    )

    tipo: Mapped[TipoArtefatoEnum] = mapped_column(
        Enum(
            TipoArtefatoEnum,
            name="tipo_artefato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    status: Mapped[StatusArtefatoEnum] = mapped_column(
        Enum(
            StatusArtefatoEnum,
            name="status_artefato_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=StatusArtefatoEnum.NAO_INICIADO,
    )

    data_inicio: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Preenchida quando o artefato é iniciado.",
    )
    data_conclusao: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Preenchida quando o artefato é concluído.",
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
    projeto: Mapped["Projeto"] = relationship(back_populates="artefatos")

    historico_datas: Mapped[list["HistoricoDataArtefato"]] = relationship(
        "HistoricoDataArtefato",
        back_populates="artefato",
        cascade="all, delete-orphan",
        order_by="HistoricoDataArtefato.data_registro.desc()",
    )

    comentarios: Mapped[list["ComentarioArtefato"]] = relationship(
        "ComentarioArtefato",
        back_populates="artefato",
        cascade="all, delete-orphan",
        order_by="ComentarioArtefato.criado_em.desc()",
    )

    # ── Constraints ─────────────────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint(
            "projeto_id", "tipo",
            name="uq_artefato_por_projeto_tipo",
        ),
    )

    def __repr__(self) -> str:
        return f"<Artefato {self.tipo.value} projeto_id={self.projeto_id} status={self.status.value}>"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  3b. COMENTÁRIO DE ARTEFATO (histórico de observações)                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class ComentarioArtefato(Base):
    """Histórico de comentários/observações de um artefato."""
    __tablename__ = "comentarios_artefato"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    artefato_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("artefatos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    conteudo: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Texto do comentário/observação.",
    )
    autor: Mapped[str] = mapped_column(
        String(200), nullable=False, default="Usuário do Sistema",
        comment="Autor do comentário (temporário até JWT).",
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    # ── Relationships ───────────────────────────────────────────────────────
    artefato: Mapped["Artefato"] = relationship(back_populates="comentarios")

    def __repr__(self) -> str:
        return f"<ComentarioArtefato #{self.id} artefato_id={self.artefato_id}>"


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  4. HISTÓRICO DE DATA DE ARTEFATO (auditoria de compliance)            ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class HistoricoDataArtefato(Base):
    __tablename__ = "historico_datas_artefato"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    artefato_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("artefatos.id", ondelete="CASCADE"),
        nullable=False,
    )

    tipo_data_alterada: Mapped[TipoDataAlteradaEnum] = mapped_column(
        Enum(
            TipoDataAlteradaEnum,
            name="tipo_data_alterada_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )

    data_antiga: Mapped[date] = mapped_column(Date, nullable=False)
    data_nova: Mapped[date] = mapped_column(Date, nullable=False)
    justificativa: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Justificativa obrigatória para a alteração de data.",
    )

    data_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Timestamp automático do momento da alteração.",
    )

    # ── Relationships ───────────────────────────────────────────────────────
    artefato: Mapped["Artefato"] = relationship(back_populates="historico_datas")

    def __repr__(self) -> str:
        return (
            f"<HistoricoDataArtefato artefato_id={self.artefato_id} "
            f"{self.tipo_data_alterada.value}: {self.data_antiga} → {self.data_nova}>"
        )


# ── Forward reference imports (resolve string annotations) ────────────────
from app.models.pdtic import AcaoPdtic  # noqa: E402, F401
from app.models.pacc import ItemPacc  # noqa: E402, F401
