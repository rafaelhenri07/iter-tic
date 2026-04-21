import asyncio
from sqlalchemy import text
from app.database import engine

async def alter_db():
    print("Altering PACC SEI column length...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE pacc_itens ALTER COLUMN processo_sei TYPE VARCHAR(500);"))
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(alter_db())
