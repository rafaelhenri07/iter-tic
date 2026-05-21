"""
Migration: Adicionar coluna is_legado na tabela projetos
         + Tornar prioridade e complexidade nullable

Uso: python add_is_legado.py
"""

import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate():
    print("=== Migrando: is_legado + nullable prioridade/complexidade ===")
    async with engine.begin() as conn:
        # 1. Adicionar coluna is_legado (BOOLEAN NOT NULL DEFAULT FALSE)
        try:
            await conn.execute(text(
                "ALTER TABLE projetos ADD COLUMN is_legado BOOLEAN NOT NULL DEFAULT FALSE;"
            ))
            print("[OK] Coluna is_legado adicionada.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("[SKIP] Coluna is_legado já existe.")
            else:
                raise

        # 2. Tornar prioridade nullable
        try:
            await conn.execute(text(
                "ALTER TABLE projetos ALTER COLUMN prioridade DROP NOT NULL;"
            ))
            print("[OK] Coluna prioridade agora é nullable.")
        except Exception as e:
            print(f"[INFO] prioridade: {e}")

        # 3. Tornar complexidade nullable
        try:
            await conn.execute(text(
                "ALTER TABLE projetos ALTER COLUMN complexidade DROP NOT NULL;"
            ))
            print("[OK] Coluna complexidade agora é nullable.")
        except Exception as e:
            print(f"[INFO] complexidade: {e}")

    print("=== Migração concluída! ===")


if __name__ == "__main__":
    asyncio.run(migrate())
