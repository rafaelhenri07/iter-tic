import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:Raf0710*@127.0.0.1:5432/itertic"

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Check if the column already exists
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='projetos' AND column_name='observacoes';"
        ))
        row = result.fetchone()
        if not row:
            print("Adding column 'observacoes' to table 'projetos'...")
            await conn.execute(text("ALTER TABLE projetos ADD COLUMN observacoes TEXT;"))
            print("Column 'observacoes' added successfully.")
        else:
            print("Column 'observacoes' already exists in table 'projetos'.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
