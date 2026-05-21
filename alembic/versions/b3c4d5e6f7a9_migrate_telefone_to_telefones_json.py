"""Migrate telefone (string) to telefones (JSON array)

Revision ID: b3c4d5e6f7a9
Revises: a2b3c4d5e6f7
Create Date: 2026-05-13 17:18:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a9'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename telefone -> telefones and change type to JSON."""
    # 1. Add new JSON column
    op.add_column(
        'empresas',
        sa.Column(
            'telefones',
            sa.JSON(),
            nullable=True,
            comment='Lista de telefones de contato no formato (XX) XXXXX-XXXX.',
        ),
    )

    # 2. Migrate existing data: wrap old single telefone into a JSON array
    op.execute(
        """
        UPDATE empresas
        SET telefones = CASE
            WHEN telefone IS NOT NULL AND telefone != ''
            THEN json_build_array(telefone)
            ELSE '[]'::json
        END
        """
    )

    # 3. Drop old column
    op.drop_column('empresas', 'telefone')


def downgrade() -> None:
    """Restore telefone (string) from telefones (JSON array)."""
    # 1. Re-add old column
    op.add_column(
        'empresas',
        sa.Column('telefone', sa.String(length=30), nullable=True),
    )

    # 2. Migrate first element back
    op.execute(
        """
        UPDATE empresas
        SET telefone = telefones->>0
        WHERE telefones IS NOT NULL AND json_array_length(telefones) > 0
        """
    )

    # 3. Drop new column
    op.drop_column('empresas', 'telefones')
