"""add_rbac_auditoria_and_seed_admin

Revision ID: a7b8c9d0e1f2
Revises: 365771570849
Create Date: 2026-04-29 14:10:00.000000

Alterações:
  - ALTER TABLE usuarios: adiciona colunas role, servidor_id, criado_em, atualizado_em
  - CREATE TABLE auditoria_logs
  - INSERT super admin: admin@pcdf.df.gov.br (Admin@2026)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = '365771570849'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ── 1. Criar o enum de role ────────────────────────────────────────────
    role_enum = sa.Enum('ADMIN', 'COMUM', name='role_usuario_enum')
    role_enum.create(op.get_bind(), checkfirst=True)

    # ── 2. Alterar tabela usuarios ─────────────────────────────────────────
    op.add_column('usuarios', sa.Column(
        'role',
        sa.Enum('ADMIN', 'COMUM', name='role_usuario_enum', create_type=False),
        nullable=False,
        server_default='COMUM',
        comment='Papel do usuário: ADMIN ou COMUM',
    ))
    op.add_column('usuarios', sa.Column(
        'servidor_id',
        sa.Integer(),
        sa.ForeignKey('servidores.id', ondelete='SET NULL'),
        nullable=True,
        comment='Vínculo opcional com a tabela de Servidores',
    ))
    op.add_column('usuarios', sa.Column(
        'criado_em',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ))
    op.add_column('usuarios', sa.Column(
        'atualizado_em',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ))

    # ── 3. Criar tabela auditoria_logs ─────────────────────────────────────
    op.create_table(
        'auditoria_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('usuarios.id', ondelete='SET NULL'),
                   nullable=True, comment='ID do usuário que realizou a ação'),
        sa.Column('user_email', sa.String(255), nullable=True,
                   comment='Email do usuário no momento da ação'),
        sa.Column('acao', sa.String(20), nullable=False,
                   comment='Tipo de operação: CREATE, UPDATE, DELETE'),
        sa.Column('entidade', sa.String(100), nullable=False,
                   comment='Nome da entidade/módulo afetado'),
        sa.Column('entidade_id', sa.Integer(), nullable=True,
                   comment='ID do registro afetado'),
        sa.Column('detalhes', sa.Text(), nullable=True,
                   comment='Detalhes da operação em formato JSON'),
        sa.Column('ip_address', sa.String(45), nullable=True,
                   comment='Endereço IP do cliente'),
        sa.Column('rota', sa.String(500), nullable=True,
                   comment='Path da rota HTTP acessada'),
        sa.Column('metodo_http', sa.String(10), nullable=True,
                   comment='Método HTTP utilizado'),
        sa.Column('timestamp', sa.DateTime(timezone=True),
                   server_default=sa.func.now(), nullable=False,
                   comment='Data e hora da operação'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Índices para performance de consultas de auditoria
    op.create_index('ix_auditoria_logs_user_id', 'auditoria_logs', ['user_id'])
    op.create_index('ix_auditoria_logs_acao', 'auditoria_logs', ['acao'])
    op.create_index('ix_auditoria_logs_entidade', 'auditoria_logs', ['entidade'])
    op.create_index('ix_auditoria_logs_timestamp', 'auditoria_logs', ['timestamp'])

    # ── 4. Seed: Super Usuário Admin ───────────────────────────────────────
    op.execute(
        sa.text("""
            INSERT INTO usuarios (nome, email, senha_hash, is_active, role, criado_em, atualizado_em)
            VALUES (
                'Administrador ITER TIC',
                'admin@pcdf.df.gov.br',
                '$2b$12$0whvxEz6ytXtG7o0/.OWd.50cL/Q.OnfY229XA9KnimSOD4Aig2Fy',
                true,
                'ADMIN',
                NOW(),
                NOW()
            )
            ON CONFLICT (email) DO NOTHING;
        """)
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Remover admin seed
    op.execute(
        sa.text("DELETE FROM usuarios WHERE email = 'admin@pcdf.df.gov.br';")
    )

    # Dropar tabela de auditoria
    op.drop_index('ix_auditoria_logs_timestamp', table_name='auditoria_logs')
    op.drop_index('ix_auditoria_logs_entidade', table_name='auditoria_logs')
    op.drop_index('ix_auditoria_logs_acao', table_name='auditoria_logs')
    op.drop_index('ix_auditoria_logs_user_id', table_name='auditoria_logs')
    op.drop_table('auditoria_logs')

    # Remover colunas adicionadas em usuarios
    op.drop_column('usuarios', 'atualizado_em')
    op.drop_column('usuarios', 'criado_em')
    op.drop_column('usuarios', 'servidor_id')
    op.drop_column('usuarios', 'role')

    # Dropar o enum
    sa.Enum(name='role_usuario_enum').drop(op.get_bind(), checkfirst=True)
