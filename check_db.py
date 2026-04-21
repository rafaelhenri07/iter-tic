import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.begin() as conn:
        r = await conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contrato_equipe')"
        ))
        exists = r.scalar()
        print(f"contrato_equipe exists: {exists}")

        r2 = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'contratos' AND column_name IN "
            "('gestor_id','fiscal_requisitante_id','fiscal_tecnico_id','fiscal_administrativo_id')"
        ))
        old_cols = [row[0] for row in r2]
        print(f"Old FK columns still present: {old_cols}")

asyncio.run(check())
