"""
ITER TIC - Modelo SQLAlchemy do Usuário (Autenticação e RBAC)

Armazena credenciais de acesso ao sistema com hash seguro via bcrypt,
papel (role) para controle de acesso, e vínculo opcional com Servidor.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Boolean, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import RoleUsuarioEnum


class Usuario(Base):
    """Usuário do sistema com credenciais de autenticação e RBAC."""
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    nome: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Nome completo do usuário"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="E-mail institucional (login único)"
    )
    senha_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Hash bcrypt da senha do usuário"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Indica se o usuário está ativo no sistema"
    )
    role: Mapped[RoleUsuarioEnum] = mapped_column(
        Enum(
            RoleUsuarioEnum,
            name="role_usuario_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=RoleUsuarioEnum.COMUM,
        server_default="COMUM",
        comment="Papel do usuário: ADMIN ou COMUM"
    )
    servidor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("servidores.id", ondelete="SET NULL"),
        nullable=True,
        comment="Vínculo opcional com a tabela de Servidores"
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
    servidor: Mapped[Optional["Servidor"]] = relationship(
        "Servidor", foreign_keys=[servidor_id], lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Usuario #{self.id} email='{self.email}' role={self.role.value} active={self.is_active}>"


# ── Forward reference ──────────────────────────────────────────────────────
from app.models.projeto import Servidor  # noqa: E402, F401
