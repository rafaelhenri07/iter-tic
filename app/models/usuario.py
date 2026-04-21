"""
ITER TIC - Modelo SQLAlchemy do Usuário (Autenticação)

Armazena credenciais de acesso ao sistema com hash seguro via bcrypt.
"""

from sqlalchemy import Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Usuario(Base):
    """Usuário do sistema com credenciais de autenticação."""
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

    def __repr__(self) -> str:
        return f"<Usuario #{self.id} email='{self.email}' active={self.is_active}>"
