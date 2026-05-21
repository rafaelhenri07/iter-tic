import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_auditoria_logs():
    print("Atualizando registros históricos de auditoria para o módulo Equipe...")
    try:
        async with engine.begin() as conn:
            # Query para atualizar registros cujo rota contenha o caminho de servidores
            query = text("""
                UPDATE auditoria_logs 
                SET entidade = 'Equipe' 
                WHERE rota LIKE '/api/v1/projetos/servidores%' 
                   OR rota LIKE '/projetos/servidores%';
            """)
            result = await conn.execute(query)
            print(f"Sucesso! Registros alterados: {result.rowcount}")
    except Exception as e:
        print(f"Erro ao atualizar logs de auditoria: {e}")

if __name__ == "__main__":
    asyncio.run(fix_auditoria_logs())
