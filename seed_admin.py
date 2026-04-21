"""
ITER TIC - Script para criar usuário inicial
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_factory
from app.models.usuario import Usuario
from app.core.security import get_password_hash

async def create_admin():
    async with async_session_factory() as db:
        admin = Usuario(
            nome="Administrador do Sistema",
            email="admin@itertic.gov.br",
            senha_hash=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Usuário criado com sucesso!")
        print("Email: admin@itertic.gov.br")
        print("Senha: admin123")

if __name__ == "__main__":
    asyncio.run(create_admin())
