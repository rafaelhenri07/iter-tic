"""Simplify status_projeto_enum to 3 phases

Revision ID: a1b2c3d4e5f6
Revises: faf1705e4908
Create Date: 2026-04-21 21:34:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'faf1705e4908'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace old 6-value enum with new 3-value enum.

    Strategy: convert column to text, drop old enum, create new enum,
    map data, cast column back to enum.
    """

    # 1. Convert column to text (drops dependency on old enum)
    op.execute("ALTER TABLE projetos ALTER COLUMN status TYPE text")

    # 2. Drop old enum type
    op.execute("DROP TYPE status_projeto_enum")

    # 3. Map existing data to new values
    op.execute("""
        UPDATE projetos SET status = 'Fase interna'
        WHERE status IN ('Em elaboração', 'Pronto para contratação', 'Suspenso', 'Cancelado')
    """)
    op.execute("""
        UPDATE projetos SET status = 'Fase externa'
        WHERE status = 'Em licitação'
    """)
    op.execute("""
        UPDATE projetos SET status = 'Contratado'
        WHERE status = 'Licitação concluída'
    """)

    # 4. Create new enum type
    op.execute(
        "CREATE TYPE status_projeto_enum AS ENUM ('Fase interna', 'Fase externa', 'Contratado')"
    )

    # 5. Cast column back to the new enum
    op.execute(
        "ALTER TABLE projetos ALTER COLUMN status TYPE status_projeto_enum "
        "USING status::status_projeto_enum"
    )


def downgrade() -> None:
    """Restore original 6-value enum (best-effort data mapping)."""
    op.execute("ALTER TABLE projetos ALTER COLUMN status TYPE text")
    op.execute("DROP TYPE status_projeto_enum")

    op.execute("""
        UPDATE projetos SET status = 'Em elaboração'
        WHERE status = 'Fase interna'
    """)
    op.execute("""
        UPDATE projetos SET status = 'Em licitação'
        WHERE status = 'Fase externa'
    """)
    op.execute("""
        UPDATE projetos SET status = 'Licitação concluída'
        WHERE status = 'Contratado'
    """)

    op.execute(
        "CREATE TYPE status_projeto_enum AS ENUM ("
        "'Em elaboração', 'Pronto para contratação', "
        "'Em licitação', 'Licitação concluída', "
        "'Suspenso', 'Cancelado')"
    )
    op.execute(
        "ALTER TABLE projetos ALTER COLUMN status TYPE status_projeto_enum "
        "USING status::status_projeto_enum"
    )
