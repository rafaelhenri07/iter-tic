"""Consolidar Empresas e Fabricantes em Fornecedores + Catalogo

Revision ID: c1d2e3f4a5b6
Revises: 9307020608f6
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "c1d2e3f4a5b6"
down_revision = "9307020608f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Criar tabela catalogo_produtos ──────────────────────────────────
    op.create_table(
        "catalogo_produtos",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(300), nullable=False, unique=True, index=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── 2. Criar tabela fornecedores ──────────────────────────────────────
    op.create_table(
        "fornecedores",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(300), nullable=False, index=True),
        sa.Column(
            "natureza",
            sa.Enum("PESSOA_FISICA", "PESSOA_JURIDICA", name="natureza_fornecedor_enum"),
            nullable=False,
        ),
        sa.Column("documento", sa.String(18), nullable=True, index=True),
        sa.Column("site", sa.String(300), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("contatos", sa.JSON, nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("delete_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default="false"),
    )

    # ── 3. Criar tabela associativa fornecedor_catalogo ────────────────────
    op.create_table(
        "fornecedor_catalogo",
        sa.Column("fornecedor_id", sa.Integer, sa.ForeignKey("fornecedores.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("catalogo_produto_id", sa.Integer, sa.ForeignKey("catalogo_produtos.id", ondelete="CASCADE"), primary_key=True),
    )

    # ── 4. Alterar tabela contratos ───────────────────────────────────────
    # Dropar FKs dinamicamente (nomes podem variar)
    op.execute("""
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'contratos'::regclass
                  AND contype = 'f'
                  AND (
                      conname LIKE '%empresa%'
                      OR conname LIKE '%fabricante%'
                  )
            )
            LOOP
                EXECUTE 'ALTER TABLE contratos DROP CONSTRAINT ' || quote_ident(r.conname);
            END LOOP;
        END $$;
    """)

    # Remover colunas antigas
    op.drop_column("contratos", "empresa_id")
    op.drop_column("contratos", "fabricante_id")

    # Adicionar novas colunas
    op.add_column("contratos", sa.Column("fornecedor_id", sa.Integer, nullable=True))
    op.add_column("contratos", sa.Column("tipo_fornecedor_contrato", sa.String(30), nullable=True))

    # Criar FK para fornecedores
    op.create_foreign_key(
        "contratos_fornecedor_id_fkey",
        "contratos",
        "fornecedores",
        ["fornecedor_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # ── 5. Dropar tabelas antigas ─────────────────────────────────────────
    op.drop_table("empresas")
    op.drop_table("fabricantes")


def downgrade() -> None:
    # Recriar tabelas antigas (simplificado)
    op.create_table(
        "empresas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nome", sa.String(300), nullable=False),
        sa.Column("cnpj", sa.String(18)),
        sa.Column("site", sa.String(300)),
        sa.Column("contato_nome", sa.String(150)),
        sa.Column("telefones", sa.JSON),
        sa.Column("email", sa.String(200)),
        sa.Column("servicos_ofertados", sa.JSON),
        sa.Column("create_time", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("update_time", sa.DateTime(timezone=True)),
        sa.Column("delete_time", sa.DateTime(timezone=True)),
        sa.Column("is_deleted", sa.Boolean, server_default="false"),
    )
    op.create_table(
        "fabricantes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("site", sa.String(300)),
        sa.Column("contato_nome", sa.String(150)),
        sa.Column("contato_cargo", sa.String(100)),
        sa.Column("contato_telefone1", sa.String(30)),
        sa.Column("contato_telefone2", sa.String(30)),
        sa.Column("contato_email", sa.String(200)),
        sa.Column("create_time", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("update_time", sa.DateTime(timezone=True)),
        sa.Column("delete_time", sa.DateTime(timezone=True)),
        sa.Column("is_deleted", sa.Boolean, server_default="false"),
    )

    # Reverter contratos
    op.drop_constraint("contratos_fornecedor_id_fkey", "contratos", type_="foreignkey")
    op.drop_column("contratos", "tipo_fornecedor_contrato")
    op.drop_column("contratos", "fornecedor_id")
    op.add_column("contratos", sa.Column("empresa_id", sa.Integer))
    op.add_column("contratos", sa.Column("fabricante_id", sa.Integer))

    # Dropar novas tabelas
    op.drop_table("fornecedor_catalogo")
    op.drop_table("fornecedores")
    op.drop_table("catalogo_produtos")

    # Dropar enum
    sa.Enum(name="natureza_fornecedor_enum").drop(op.get_bind(), checkfirst=True)
