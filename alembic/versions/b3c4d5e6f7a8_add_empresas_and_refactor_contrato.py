"""
add_empresas_and_refactor_contrato

Revision ID: b3c4d5e6f7a8
Revises: fbc8caaf067b
Create Date: 2026-04-22

Mudanças:
  1. Cria tabela `empresas`.
  2. Adiciona coluna `empresa_id` (FK para empresas) na tabela `contratos`.
  3. Remove coluna `empresa_contratada` da tabela `contratos`.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "b3c4d5e6f7a8"
down_revision = "fbc8caaf067b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Criar tabela empresas ─────────────────────────────────────────
    op.create_table(
        "empresas",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("nome", sa.String(300), nullable=False),
        sa.Column("cnpj", sa.String(18), nullable=False),
        sa.Column("site", sa.String(300), nullable=True),
        sa.Column("contato_nome", sa.String(150), nullable=False),
        sa.Column("telefone", sa.String(30), nullable=False),
        sa.Column("email", sa.String(200), nullable=False),
        sa.Column("servicos_ofertados", sa.JSON(), nullable=True),
        sa.Column(
            "create_time",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("update_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delete_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cnpj", name="uq_empresa_cnpj"),
    )
    op.create_index("ix_empresas_nome", "empresas", ["nome"], unique=False)
    op.create_index("ix_empresas_cnpj", "empresas", ["cnpj"], unique=True)

    # ── 2. Adicionar empresa_id em contratos ─────────────────────────────
    op.add_column(
        "contratos",
        sa.Column("empresa_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_contratos_empresa_id",
        "contratos",
        "empresas",
        ["empresa_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # ── 3. Remover coluna empresa_contratada ─────────────────────────────
    op.drop_column("contratos", "empresa_contratada")


def downgrade() -> None:
    # Reverter: adicionar empresa_contratada de volta
    op.add_column(
        "contratos",
        sa.Column(
            "empresa_contratada",
            sa.String(500),
            nullable=True,  # nullable para não quebrar no downgrade
        ),
    )

    # Remover FK e coluna empresa_id
    op.drop_constraint("fk_contratos_empresa_id", "contratos", type_="foreignkey")
    op.drop_column("contratos", "empresa_id")

    # Remover tabela empresas
    op.drop_index("ix_empresas_cnpj", table_name="empresas")
    op.drop_index("ix_empresas_nome", table_name="empresas")
    op.drop_table("empresas")
