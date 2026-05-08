"""
ITER TIC - Rotas de Autenticação

Endpoints públicos de login e endpoint protegido /me.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.usuario import Usuario
from app.core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UsuarioResponse,
    UsuarioMeResponse,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Autentica o usuário via email + senha e retorna um JWT.
    O token contém `sub` (email) e `role` (ADMIN/COMUM) no payload.
    """
    query = select(Usuario).where(Usuario.email == payload.email)
    result = await db.execute(query)
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(payload.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado. Contate o administrador.",
        )

    access_token = create_access_token(
        data={
            "sub": usuario.email,
            "role": usuario.role.value,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        usuario=UsuarioResponse.model_validate(usuario),
    )


@router.get("/me", response_model=UsuarioMeResponse)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    """
    Retorna os dados do usuário autenticado, incluindo o Servidor vinculado
    (se houver). Útil para o front-end montar o perfil e controlar permissões.
    """
    return UsuarioMeResponse.model_validate(current_user)
