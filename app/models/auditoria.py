"""
ITER TIC - Modelo SQLAlchemy de Auditoria

Registra todas as operações mutáveis (CREATE, UPDATE, DELETE) realizadas
no sistema, identificando o usuário, a entidade afetada e os detalhes
da alteração. Funciona como trilha de auditoria para compliance GovTech.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditoriaLog(Base):
    """Registro de auditoria para rastreabilidade de operações no sistema."""
    __tablename__ = "auditoria_logs"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID do usuário que realizou a ação (nullable para operações de sistema)"
    )
    user_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Email do usuário no momento da ação (preservado mesmo se o usuário for deletado)"
    )
    acao: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="Tipo de operação: CREATE, UPDATE, DELETE"
    )
    entidade: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Nome da entidade/módulo afetado (ex: Contrato, Projeto, AcaoPdtic)"
    )
    entidade_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="ID do registro afetado na entidade"
    )
    detalhes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Detalhes da operação em formato JSON (campos alterados, valores antigos/novos)"
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="Endereço IP do cliente (IPv4 ou IPv6)"
    )
    rota: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="Path da rota HTTP acessada"
    )
    metodo_http: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True,
        comment="Método HTTP utilizado (POST, PUT, PATCH, DELETE)"
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="Data e hora da operação"
    )

    def __repr__(self) -> str:
        return (
            f"<AuditoriaLog #{self.id} user={self.user_email} "
            f"acao={self.acao} entidade={self.entidade}>"
        )
