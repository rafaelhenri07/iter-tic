"""
ITER TIC - Modelos SQLAlchemy do Módulo de Configurações (White Label)
"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConfiguracaoSistema(Base):
    """Configurações globais do sistema (Singleton, usamos apenas id=1)."""
    __tablename__ = "configuracoes_sistema"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome_orgao: Mapped[str] = mapped_column(
        String(255), 
        nullable=False, 
        default="Polícia Civil do Distrito Federal",
        comment="Nome do órgão para exibição na Top Bar"
    )
    cor_primaria: Mapped[str] = mapped_column(
        String(20), 
        nullable=False, 
        default="#C4A75C",
        comment="Cor primária do sistema em HEX (ex: #C4A75C)"
    )
    logo_url: Mapped[str | None] = mapped_column(
        Text, 
        nullable=True,
        comment="Logotipo do órgão em Base64 ou URL da imagem"
    )

    def __repr__(self) -> str:
        return f"<ConfiguracaoSistema #{self.id} orgao='{self.nome_orgao}'>"
