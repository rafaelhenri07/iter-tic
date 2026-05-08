import asyncio
from sqlalchemy import select
from app.database import engine, async_session_maker
from app.models.usuario import Usuario
from app.models.enums import RoleUsuarioEnum
from app.core.security import get_password_hash

async def reset_admin():
    async with async_session_maker() as session:
        # Check if admin exists
        stmt = select(Usuario).where(Usuario.email == "admin@itertic.gov.br")
        result = await session.execute(stmt)
        admin = result.scalar_one_or_none()
        
        hashed_pw = get_password_hash("admin123")
        
        if admin:
            admin.senha_hash = hashed_pw
            admin.is_active = True
            print("Admin user found. Password updated to admin123")
        else:
            admin = Usuario(
                nome="Administrador do Sistema",
                email="admin@itertic.gov.br",
                senha_hash=hashed_pw,
                role=RoleUsuarioEnum.ADMIN,
                is_active=True
            )
            session.add(admin)
            print("Admin user created with password admin123")
            
        await session.commit()

if __name__ == "__main__":
    asyncio.run(reset_admin())
