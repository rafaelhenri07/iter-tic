"""Add tipo_instrumento to contratos

Revision ID: a2b3c4d5e6f7
Revises: 615a65f83932
Create Date: 2026-05-13 16:37:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = '615a65f83932'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tipo_instrumento column (nullable string)."""
    op.add_column(
        'contratos',
        sa.Column(
            'tipo_instrumento',
            sa.String(length=20),
            nullable=True,
            comment='Tipo de instrumento: CONTRATO ou NOTA_EMPENHO (somente para modalidade CONTRATO).',
        ),
    )
    # Backfill: contratos existentes com modalidade CONTRATO recebem 'CONTRATO'
    op.execute(
        "UPDATE contratos SET tipo_instrumento = 'CONTRATO' WHERE modalidade_contrato = 'CONTRATO' AND tipo_instrumento IS NULL"
    )


def downgrade() -> None:
    """Remove tipo_instrumento column."""
    op.drop_column('contratos', 'tipo_instrumento')
