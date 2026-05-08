"""
ITER TIC - Segurança e Autenticação (JWT + RBAC)

Módulo central de segurança com:
  - Hash de senhas via bcrypt (passlib)
  - Geração e validação de tokens JWT (PyJWT)
  - Dependências de injeção: get_current_user, require_admin
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from jwt.exceptions import PyJWTError

from app.database import get_db
from app.models.usuario import Usuario
from app.models.enums import RoleUsuarioEnum

# ── Configurações ──────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "minha_chave_super_secreta_de_desenvolvimento")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias

# ── Bcrypt ─────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gera hash bcrypt de uma senha em texto plano."""
    return pwd_context.hash(password)


# ── JWT ────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Cria um JWT assinado contendo o payload fornecido."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Dependências FastAPI ───────────────────────────────────────────────────

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """
    Dependência que extrai e valida o token JWT, busca o usuário no banco
    e retorna o objeto Usuario completo. Falha com 401 se:
      - Token inválido ou expirado
      - Usuário não encontrado
      - Usuário inativo
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception

    # Buscar usuário no banco para garantir que ainda existe e está ativo
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado. Contate o administrador.",
        )

    return user


async def require_admin(
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> Usuario:
    """
    Dependência que exige que o usuário autenticado tenha role ADMIN.
    Deve ser usada em rotas que requerem permissão administrativa.
    """
    if current_user.role != RoleUsuarioEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return current_user
