"""
ITER TIC - Configurações centralizadas via variáveis de ambiente

Utiliza Pydantic BaseSettings para carregar automaticamente do .env
com validação de tipos e valores default seguros para desenvolvimento.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configurações do sistema carregadas de variáveis de ambiente / .env"""

    # ── Segurança ──────────────────────────────────────────────────────────
    SECRET_KEY: str = "minha_chave_super_secreta_de_desenvolvimento"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias

    # ── SMTP (E-mail) ──────────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "noreply@itertic.pcdf.df.gov.br"
    SMTP_USE_TLS: bool = True

    # ── Frontend ───────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: Optional[str] = None

    @property
    def is_smtp_configured(self) -> bool:
        """Retorna True se as credenciais SMTP estão preenchidas."""
        return bool(self.SMTP_HOST and self.SMTP_USER)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


# Instância singleton — importar em qualquer lugar do projeto
settings = Settings()
