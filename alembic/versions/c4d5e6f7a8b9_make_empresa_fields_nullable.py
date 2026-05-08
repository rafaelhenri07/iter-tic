"""
make_empresa_fields_nullable

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8, a1b2c3d4e5f6
Create Date: 2026-04-22

Torna os campos cnpj, contato_nome, telefone e email da tabela
empresas opcionais (nullable), conforme regra de negócio revisada
onde apenas o nome da empresa é obrigatório.
"""

from alembic import op
import sqlalchemy as sa

revision = "c4d5e6f7a8b9"
down_revision = ("b3c4d5e6f7a8", "a1b2c3d4e5f6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("empresas", "cnpj", nullable=True)
    op.alter_column("empresas", "contato_nome", nullable=True)
    op.alter_column("empresas", "telefone", nullable=True)
    op.alter_column("empresas", "email", nullable=True)


def downgrade() -> None:
    # Preenche com string vazia antes de tornar NOT NULL
    op.execute("UPDATE empresas SET cnpj = '' WHERE cnpj IS NULL")
    op.execute("UPDATE empresas SET contato_nome = '' WHERE contato_nome IS NULL")
    op.execute("UPDATE empresas SET telefone = '' WHERE telefone IS NULL")
    op.execute("UPDATE empresas SET email = '' WHERE email IS NULL")

    op.alter_column("empresas", "cnpj", nullable=False)
    op.alter_column("empresas", "contato_nome", nullable=False)
    op.alter_column("empresas", "telefone", nullable=False)
    op.alter_column("empresas", "email", nullable=False)
