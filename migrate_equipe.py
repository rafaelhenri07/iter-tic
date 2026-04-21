import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate():
    async with engine.begin() as conn:
        print("=== MIGRACAO: Equipe de Fiscalizacao ===")

        # 1. Criar enum
        print("[1/4] Criando enum papel_equipe_enum...")
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE papel_equipe_enum AS ENUM (
                    'gestor', 'fiscal_requisitante', 'fiscal_tecnico', 'fiscal_administrativo'
                );
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
        """))

        # 2. Criar tabela
        print("[2/4] Criando tabela contrato_equipe...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS contrato_equipe (
                id SERIAL PRIMARY KEY,
                contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
                servidor_id INTEGER NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
                papel papel_equipe_enum NOT NULL,
                is_titular BOOLEAN NOT NULL DEFAULT FALSE
            );
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_contrato_equipe_contrato_id ON contrato_equipe(contrato_id);"
        ))

        # 3. Migrar dados
        print("[3/4] Migrando dados das colunas FK antigas...")
        papeis = [
            ("gestor_id", "gestor"),
            ("fiscal_requisitante_id", "fiscal_requisitante"),
            ("fiscal_tecnico_id", "fiscal_tecnico"),
            ("fiscal_administrativo_id", "fiscal_administrativo"),
        ]
        total = 0
        for col, papel in papeis:
            r = await conn.execute(text(
                f"INSERT INTO contrato_equipe (contrato_id, servidor_id, papel, is_titular) "
                f"SELECT id, {col}, '{papel}'::papel_equipe_enum, TRUE "
                f"FROM contratos WHERE {col} IS NOT NULL "
                f"ON CONFLICT DO NOTHING"
            ))
            count = r.rowcount
            total += count
            if count > 0:
                print(f"   {papel}: {count} titular(es) migrado(s)")

        if total == 0:
            print("   Nenhum dado para migrar")
        else:
            print(f"   Total: {total} registros migrados")

        # 4. Remover colunas FK antigas
        print("[4/4] Removendo colunas FK antigas...")
        for col, _ in papeis:
            await conn.execute(text(
                f"DO $$ DECLARE r RECORD; BEGIN "
                f"FOR r IN (SELECT constraint_name FROM information_schema.table_constraints "
                f"WHERE table_name = 'contratos' AND constraint_type = 'FOREIGN KEY' "
                f"AND constraint_name LIKE '%{col}%') LOOP "
                f"EXECUTE 'ALTER TABLE contratos DROP CONSTRAINT ' || r.constraint_name; "
                f"END LOOP; END $$;"
            ))
            await conn.execute(text(f"ALTER TABLE contratos DROP COLUMN IF EXISTS {col}"))
            print(f"   {col} removida")

        print("\nMigracao concluida com sucesso!")


asyncio.run(migrate())
