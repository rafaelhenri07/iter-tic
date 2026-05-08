"""refactor_tipo_necessidade_to_array

Revision ID: d1e2f3a4b5c6
Revises: 60aefd345bc8
Create Date: 2026-04-30 18:00:00.000000

Alterações:
  - ALTER TABLE pdtic_acoes: converte coluna tipo_necessidade
    de Enum (tipo_necessidade_enum) para VARCHAR[] (ARRAY de strings).
  - Migra os dados existentes envolvendo o valor atual em um array [valor].
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = '60aefd345bc8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Converte tipo_necessidade de Enum para ARRAY(VARCHAR)."""

    # 1. Adicionar coluna temporária como text[]
    op.add_column(
        'pdtic_acoes',
        sa.Column('tipo_necessidade_new', ARRAY(sa.String(50)), nullable=True)
    )

    # 2. Migrar dados existentes: envolver o valor em array
    op.execute(
        sa.text(
            "UPDATE pdtic_acoes SET tipo_necessidade_new = ARRAY[tipo_necessidade::text]"
        )
    )

    # 3. Remover coluna antiga (enum)
    op.drop_column('pdtic_acoes', 'tipo_necessidade')

    # 4. Renomear nova coluna
    op.alter_column('pdtic_acoes', 'tipo_necessidade_new', new_column_name='tipo_necessidade')

    # 5. Adicionar constraint NOT NULL
    op.alter_column('pdtic_acoes', 'tipo_necessidade', nullable=False)

    # 6. Remover o tipo enum do banco (opcional, se não for mais usado)
    # Verifica se ainda é usado por outras tabelas antes de dropar
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE udt_name = 'tipo_necessidade_enum'
                    AND table_name != 'pdtic_acoes'
                ) THEN
                    DROP TYPE IF EXISTS tipo_necessidade_enum;
                END IF;
            END $$;
            """
        )
    )


def downgrade() -> None:
    """Reverte tipo_necessidade de ARRAY(VARCHAR) para Enum."""

    # 1. Recriar o enum
    tipo_enum = sa.Enum(
        'hardware', 'software', 'servico', 'comunicacao', 'capacitacao', 'outros',
        name='tipo_necessidade_enum'
    )
    tipo_enum.create(op.get_bind(), checkfirst=True)

    # 2. Adicionar coluna temporária com o tipo enum
    op.add_column(
        'pdtic_acoes',
        sa.Column(
            'tipo_necessidade_old',
            sa.Enum(
                'hardware', 'software', 'servico', 'comunicacao', 'capacitacao', 'outros',
                name='tipo_necessidade_enum',
                create_type=False,
            ),
            nullable=True
        )
    )

    # 3. Migrar: pegar o primeiro elemento do array
    op.execute(
        sa.text(
            "UPDATE pdtic_acoes SET tipo_necessidade_old = (tipo_necessidade[1])::tipo_necessidade_enum"
        )
    )

    # 4. Remover coluna array
    op.drop_column('pdtic_acoes', 'tipo_necessidade')

    # 5. Renomear
    op.alter_column('pdtic_acoes', 'tipo_necessidade_old', new_column_name='tipo_necessidade')
    op.alter_column('pdtic_acoes', 'tipo_necessidade', nullable=False)
