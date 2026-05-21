"""
ITER TIC - Script de criação/reset do admin root (Break-Glass Account)

Cria ou atualiza a conta de superadmin com matrícula virtual 'ROOT'.
Este é o único usuário que não está vinculado a um servidor real.
"""

import asyncio
from sqlalchemy import select
from app.database import engine, async_session_factory
from app.models.usuario import Usuario
from app.models.enums import RoleUsuarioEnum
from app.core.security import get_password_hash


async def reset_admin():
    async with async_session_factory() as session:
        # Check if admin exists by matricula ROOT or by email legado
        stmt = select(Usuario).where(
            (Usuario.matricula == "ROOT") | (Usuario.email == "admin@itertic.gov.br")
        )
        result = await session.execute(stmt)
        admin = result.scalar_one_or_none()

        hashed_pw = get_password_hash("admin123")

        if admin:
            admin.senha_hash = hashed_pw
            admin.matricula = "ROOT"
            admin.is_active = True
            print("[OK] Admin ROOT encontrado. Senha atualizada para admin123")
            print(f"   Matrícula de login: ROOT")
        else:
            admin = Usuario(
                nome="Administrador do Sistema",
                email="admin@itertic.gov.br",
                matricula="ROOT",
                senha_hash=hashed_pw,
                role=RoleUsuarioEnum.ADMIN,
                is_active=True,
            )
            session.add(admin)
            print("[OK] Admin ROOT criado com sucesso!")
            print(f"   Matrícula de login: ROOT")
            print(f"   Senha: admin123")

        await session.commit()
        print("\n[!] ATENCAO: Altere a senha padrao apos o primeiro login!")


if __name__ == "__main__":
    asyncio.run(reset_admin())
