"""add_sla_fields_to_artefatos

Revision ID: b2c3d4e5f6a7
Revises: a7b8c9d0e1f2
Create Date: 2026-04-29 20:20:00.000000

Alterações:
  - ALTER TABLE artefatos: adiciona colunas data_fim_prevista (Date) e justificativa_atraso (Text)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona campos de SLA ao modelo de artefatos."""
    op.add_column('artefatos', sa.Column(
        'data_fim_prevista',
        sa.Date(),
        nullable=True,
        comment='Prazo calculado automaticamente (SLA) ao iniciar o artefato.',
    ))
    op.add_column('artefatos', sa.Column(
        'justificativa_atraso',
        sa.Text(),
        nullable=True,
        comment='Obrigatória quando data_conclusao > data_fim_prevista.',
    ))


def downgrade() -> None:
    """Remove campos de SLA dos artefatos."""
    op.drop_column('artefatos', 'justificativa_atraso')
    op.drop_column('artefatos', 'data_fim_prevista')
