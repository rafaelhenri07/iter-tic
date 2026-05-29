"""add_projeto_historico

Revision ID: 94a109353b60
Revises: 5e20bcce48c9
Create Date: 2026-05-21 19:50:33.986578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94a109353b60'
down_revision: Union[str, Sequence[str], None] = '5e20bcce48c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('projeto_historico',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('projeto_id', sa.Integer(), nullable=False),
    sa.Column('data_hora', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('autor', sa.String(length=200), nullable=False, comment='Autor da ação (temporário até JWT).'),
    sa.Column('tipo_registro', sa.Enum('Edição de Sistema', 'Observação Manual', name='tipo_registro_historico_projeto_enum'), nullable=False),
    sa.Column('conteudo', sa.Text(), nullable=False, comment='Descrição da mudança ou texto da observação.'),
    sa.ForeignKeyConstraint(['projeto_id'], ['projetos.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projeto_historico_projeto_id'), 'projeto_historico', ['projeto_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_projeto_historico_projeto_id'), table_name='projeto_historico')
    op.drop_table('projeto_historico')
    op.execute('DROP TYPE tipo_registro_historico_projeto_enum')
