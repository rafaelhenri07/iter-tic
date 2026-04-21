"""
ITER TIC - Script para criar o usuário administrador padrão.

Execução:
    python seed_usuario.py

Cria o usuário admin se ele ainda não existir no banco.
"""

import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.usuario import Usuario
from app.core.security import hash_senha

# Dados do usuário administrador padrão
ADMIN_EMAIL = "admin@itertic.gov.br"
ADMIN_NOME = "Administrador"
ADMIN_SENHA = "admin123"  # Altere imediatamente após o primeiro login


async def seed_admin():
    """Cria o usuário administrador caso não exista."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(Usuario).where(Usuario.email == ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[INFO] Usuário '{ADMIN_EMAIL}' já existe (id={existing.id}).")
            return

        admin = Usuario(
            nome=ADMIN_NOME,
            email=ADMIN_EMAIL,
            senha_hash=hash_senha(ADMIN_SENHA),
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f"[OK] Usuário administrador criado: {ADMIN_EMAIL} / {ADMIN_SENHA}")
        print("[AVISO] Altere a senha padrão imediatamente!")


if __name__ == "__main__":
    asyncio.run(seed_admin())
