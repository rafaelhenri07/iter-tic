"""add_vigencia_fields_and_aditivos

Revision ID: f1a2b3c4d5e6
Revises: c4d5e6f7a8b9
Create Date: 2026-04-23

Changes:
  - contratos: DROP COLUMN prazo
  - contratos: ADD COLUMN data_inicio_vigencia DATE
  - contratos: ADD COLUMN vigencia_meses INTEGER
  - contratos: ADD COLUMN prorrogacao_meses INTEGER DEFAULT 0
  - CREATE TABLE aditivos
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "f1a2b3c4d5e6"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Remover coluna prazo ───────────────────────────────────────────────
    op.drop_column("contratos", "prazo")

    # ── Adicionar novos campos de vigência ────────────────────────────────
    op.add_column(
        "contratos",
        sa.Column("data_inicio_vigencia", sa.Date(), nullable=True),
    )
    op.add_column(
        "contratos",
        sa.Column("vigencia_meses", sa.Integer(), nullable=True),
    )
    op.add_column(
        "contratos",
        sa.Column(
            "prorrogacao_meses",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # ── Criar tabela aditivos ─────────────────────────────────────────────
    op.create_table(
        "aditivos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "contrato_id",
            sa.Integer(),
            sa.ForeignKey("contratos.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("numero_aditivo", sa.String(100), nullable=False),
        sa.Column("data_inicio_vigencia", sa.Date(), nullable=False),
        sa.Column("data_fim_vigencia", sa.Date(), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    # ── Remover tabela aditivos ───────────────────────────────────────────
    op.drop_table("aditivos")

    # ── Remover novos campos de vigência ──────────────────────────────────
    op.drop_column("contratos", "prorrogacao_meses")
    op.drop_column("contratos", "vigencia_meses")
    op.drop_column("contratos", "data_inicio_vigencia")

    # ── Restaurar coluna prazo ────────────────────────────────────────────
    op.add_column(
        "contratos",
        sa.Column("prazo", sa.String(300), nullable=True),
    )
