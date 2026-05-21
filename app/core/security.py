"""
ITER TIC - Segurança e Autenticação (JWT + RBAC)

Módulo central de segurança com:
  - Hash de senhas via bcrypt (passlib)
  - Geração e validação de tokens JWT (PyJWT)
  - Sanitização de matrícula institucional
  - Tokens de ativação/reset de uso único
  - Dependências de injeção: get_current_user, require_admin
"""

import os
import re
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy import select, or_
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
ACTIVATION_TOKEN_EXPIRE_HOURS = 24  # Token de ativação/reset: 24h

# ── Bcrypt ─────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gera hash bcrypt de uma senha em texto plano."""
    return pwd_context.hash(password)


# ── Sanitização de Matrícula ───────────────────────────────────────────────

def sanitize_matricula(raw: str) -> str:
    """
    Higieniza a matrícula removendo pontos, traços e espaços,
    e converte para uppercase. Ex: '123.456-7' → '1234567', 'root' → 'ROOT'.
    """
    return re.sub(r"[\.\-\s]", "", raw).strip().upper()


# ── Validação de Senha ─────────────────────────────────────────────────────

def validar_senha(senha: str) -> str | None:
    """
    Valida regras estritas de senha. Retorna mensagem de erro ou None se válida.
    Regras: mínimo 8 caracteres, ao menos 1 letra, 1 número, 1 caractere especial.
    """
    if len(senha) < 8:
        return "A senha deve ter no mínimo 8 caracteres."
    if not re.search(r"[a-zA-Z]", senha):
        return "A senha deve conter pelo menos 1 letra."
    if not re.search(r"[0-9]", senha):
        return "A senha deve conter pelo menos 1 número."
    if not re.search(r"[^a-zA-Z0-9]", senha):
        return "A senha deve conter pelo menos 1 caractere especial (ex: @, #, $, !)."
    return None


# ── JWT ────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Cria um JWT assinado contendo o payload fornecido."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_activation_token(email: str, purpose: str) -> str:
    """
    Cria um JWT de ativação/reset de uso único.
    purpose: 'ativacao' ou 'reset'
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=ACTIVATION_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": email,
        "purpose": purpose,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_activation_token(token: str) -> dict:
    """
    Decodifica e valida um token de ativação/reset.
    Retorna o payload com 'sub' (email) e 'purpose'.
    Levanta HTTPException se inválido/expirado.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")
        if not email or purpose not in ("ativacao", "reset"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido.",
            )
        return payload
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado.",
        )


def hash_token(token: str) -> str:
    """Gera hash SHA-256 do token para armazenamento seguro no BD."""
    return hashlib.sha256(token.encode()).hexdigest()


# ── Dependências FastAPI ───────────────────────────────────────────────────

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """
    Dependência que extrai e valida o token JWT, busca o usuário no banco
    e retorna o objeto Usuario completo. Busca por matrícula (sub do JWT).
    Fallback por email para compatibilidade com admin root.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str | None = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception

    # Buscar por matrícula (padrão) OU email (fallback para tokens antigos)
    result = await db.execute(
        select(Usuario).where(
            or_(Usuario.matricula == sub, Usuario.email == sub)
        )
    )
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
