"""
ITER TIC - Alembic env.py (PostgreSQL com psycopg2 síncrono)

Configurado para:
  - Importar todos os modelos (PDTIC, PACC, Projetos) para autogenerate
  - Usar a DATABASE_URL definida em app.database (convertida para sync)
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ── Alembic Config ─────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Importar TODOS os modelos para que o autogenerate funcione ─────────────
from app.database import Base, DATABASE_URL  # noqa: E402

from app.models import enums  # noqa: E402, F401
from app.models import pdtic  # noqa: E402, F401
from app.models import pacc  # noqa: E402, F401
from app.models import projeto  # noqa: E402, F401
from app.models import contrato  # noqa: E402, F401
from app.models import usuario  # noqa: E402, F401
from app.models import auditoria  # noqa: E402, F401

target_metadata = Base.metadata

# ── Converter URL async → sync para o Alembic ─────────────────────────────
SYNC_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")
config.set_main_option("sqlalchemy.url", SYNC_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
