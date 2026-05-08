"""Add modalidade_contrato and orgao_gerenciador

Revision ID: f49d0e90d599
Revises: 6dbfe1a3fe0d
Create Date: 2026-05-07 14:02:14.335510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f49d0e90d599'
down_revision: Union[str, Sequence[str], None] = '6dbfe1a3fe0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first
    modalidade_enum = sa.Enum('CONTRATO', 'ARP', name='modalidade_contrato_enum')
    modalidade_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('contratos', sa.Column('modalidade_contrato', sa.Enum('CONTRATO', 'ARP', name='modalidade_contrato_enum'), server_default='CONTRATO', nullable=False, comment='Modalidade: CONTRATO ou ARP.'))
    op.add_column('contratos', sa.Column('orgao_gerenciador', sa.String(length=300), nullable=True, comment='Órgão gerenciador da ARP (somente para modalidade ARP).'))
    op.create_index(op.f('ix_contratos_modalidade_contrato'), 'contratos', ['modalidade_contrato'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_contratos_modalidade_contrato'), table_name='contratos')
    op.drop_column('contratos', 'orgao_gerenciador')
    op.drop_column('contratos', 'modalidade_contrato')

    # Drop the enum type
    modalidade_enum = sa.Enum('CONTRATO', 'ARP', name='modalidade_contrato_enum')
    modalidade_enum.drop(op.get_bind(), checkfirst=True)
