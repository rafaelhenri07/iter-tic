import asyncio
from sqlalchemy import text
from app.database import engine

async def alter_db():
    print("Altering database for new SituacaoContratoEnum values...")
    
    statements = [
        # Rename the existing value (if it exists)
        "ALTER TYPE situacao_contrato_enum RENAME VALUE 'Extinto, mas suporte vigente' TO 'contrato extinto com obrigações remanescentes';",
        # Add new values (using Try/Except in case they already exist)
        "ALTER TYPE situacao_contrato_enum ADD VALUE 'Vigente com execução suspensa';",
        "ALTER TYPE situacao_contrato_enum ADD VALUE 'Vigente prorrogado';"
    ]
    
    # We must run each outside of a transaction block for ADD VALUE
    async with engine.connect() as conn:
        # Set autocommit mode
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        for stmt in statements:
            try:
                print(f"Executing: {stmt}")
                await conn.execute(text(stmt))
                print("Success")
            except Exception as e:
                print(f"Note/Error executing statement: {e}")

if __name__ == "__main__":
    asyncio.run(alter_db())
