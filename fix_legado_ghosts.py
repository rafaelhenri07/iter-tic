"""
Migration: Limpar ghost values de prioridade/complexidade em projetos legados.
O frontend enviava os valores padrão ("media", "Simples") mesmo com is_legado=True.

Uso: python fix_legado_ghosts.py
"""

import asyncio
from sqlalchemy import text
from app.database import engine


async def fix():
    print("=== Limpando ghost values em projetos legados ===")
    async with engine.begin() as conn:
        result = await conn.execute(text(
            "UPDATE projetos "
            "SET prioridade = NULL, complexidade = NULL "
            "WHERE is_legado = TRUE AND (prioridade IS NOT NULL OR complexidade IS NOT NULL);"
        ))
        print(f"[OK] {result.rowcount} projeto(s) legado(s) corrigido(s).")
    print("=== Concluído! ===")


if __name__ == "__main__":
    asyncio.run(fix())
