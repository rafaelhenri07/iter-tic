"""
Script para limpar todos os dados de teste do banco de dados.
Usa TRUNCATE CASCADE para evitar problemas com foreign keys.
"""
import asyncio
from sqlalchemy import text
from app.database import engine

ALL_TABLES = [
    "historico_datas_artefato",
    "comentarios_artefato",
    "artefatos",
    "projeto_tramitacoes",
    "projetos",
    "contrato_historico",
    "contratos",
    "pacc_itens",
    "pacc_revisoes",
    "pacc_exercicios",
    "pdtic_acoes",
    "pdtic_revisoes",
    "pdtic_periodos",
    "servidores",
]

async def limpar():
    print("=" * 60)
    print("  LIMPANDO DADOS DE TESTE DO BANCO DE DADOS")
    print("=" * 60)
    async with engine.begin() as conn:
        tables_str = ", ".join(ALL_TABLES)
        await conn.execute(text(
            f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE"
        ))
        print(f"  [OK] {len(ALL_TABLES)} tabelas truncadas com sucesso!")
        for t in ALL_TABLES:
            print(f"       - {t}")
    print("=" * 60)
    print("  CONCLUIDO! Banco limpo para dados reais.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(limpar())
