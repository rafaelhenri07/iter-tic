"""Add matricula, token_ativacao to usuarios and make senha_hash nullable

Revision ID: a8b9c0d1e2f3
Revises: c6a2e629625e
Create Date: 2026-05-20 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a8b9c0d1e2f3'
down_revision: Union[str, None] = ('c6a2e629625e', 'f19c4f52f38a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Adicionar campo matricula (nullable no início para migração de dados)
    op.add_column('usuarios', sa.Column('matricula', sa.String(30), nullable=True))
    
    # 2. Adicionar campo token_ativacao
    op.add_column('usuarios', sa.Column('token_ativacao', sa.String(500), nullable=True))
    
    # 3. Tornar senha_hash nullable (para contas pendentes de ativação)
    op.alter_column('usuarios', 'senha_hash',
                    existing_type=sa.String(255),
                    nullable=True)
    
    # 4. Migrar dados: popular matricula a partir do servidor vinculado
    op.execute("""
        UPDATE usuarios u
        SET matricula = UPPER(REPLACE(REPLACE(REPLACE(s.matricula, '.', ''), '-', ''), ' ', ''))
        FROM servidores s
        WHERE u.servidor_id = s.id
        AND u.matricula IS NULL
    """)
    
    # 5. Para o admin root sem servidor, definir matrícula virtual ROOT
    op.execute("""
        UPDATE usuarios
        SET matricula = 'ROOT'
        WHERE email = 'admin@itertic.gov.br'
        AND matricula IS NULL
    """)
    
    # 6. Criar índice único e index na coluna matricula
    op.create_index('ix_usuarios_matricula', 'usuarios', ['matricula'], unique=True)
    
    # 7. Adicionar GESTOR ao enum role_usuario_enum
    op.execute("ALTER TYPE role_usuario_enum ADD VALUE IF NOT EXISTS 'GESTOR'")


def downgrade() -> None:
    # Remover índice
    op.drop_index('ix_usuarios_matricula', table_name='usuarios')
    
    # Remover colunas
    op.drop_column('usuarios', 'token_ativacao')
    op.drop_column('usuarios', 'matricula')
    
    # Restaurar senha_hash como NOT NULL
    op.alter_column('usuarios', 'senha_hash',
                    existing_type=sa.String(255),
                    nullable=False)
    
    # Nota: remover valor de enum PostgreSQL requer recreação do tipo
    # Não fazemos downgrade do enum por segurança
