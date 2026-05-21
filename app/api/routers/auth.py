"""
ITER TIC - Rotas de Autenticação

Endpoints públicos:
  - POST /auth/login — Login via matrícula + senha
  - POST /auth/definir-senha — Ativação de conta / reset de senha via token
  - POST /auth/esqueci-senha — Solicitação de recuperação de senha
Endpoint protegido:
  - GET /auth/me — Dados do usuário autenticado
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.usuario import Usuario
from app.models.projeto import Servidor
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_activation_token,
    decode_activation_token,
    hash_token,
    sanitize_matricula,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.email_service import enviar_email_reset
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UsuarioResponse,
    UsuarioMeResponse,
    DefinirSenhaRequest,
    EsqueciSenhaRequest,
    MensagemResponse,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Autentica o usuário via matrícula + senha e retorna um JWT.
    A matrícula é sanitizada (remove pontos, traços, espaços) antes da busca.
    """
    matricula_limpa = sanitize_matricula(payload.matricula)

    # Buscar por matrícula no campo desnormalizado de Usuario
    query = select(Usuario).where(Usuario.matricula == matricula_limpa)
    result = await db.execute(query)
    usuario = result.scalar_one_or_none()

    # Validações de segurança
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matrícula ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.senha_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta pendente de ativação. Verifique seu e-mail institucional.",
        )

    if not verify_password(payload.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matrícula ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado. Contate o administrador.",
        )

    access_token = create_access_token(
        data={
            "sub": usuario.matricula,
            "role": usuario.role.value,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        usuario=UsuarioResponse.model_validate(usuario),
    )


@router.post("/definir-senha", response_model=MensagemResponse)
async def definir_senha(payload: DefinirSenhaRequest, db: AsyncSession = Depends(get_db)):
    """
    Define a senha do usuário a partir de um token de ativação ou reset.
    O token é de uso único (invalidado após o uso).
    A senha deve seguir regras estritas: 8+ chars, 1 letra, 1 número, 1 especial.
    """
    # Decodificar e validar token JWT
    claims = decode_activation_token(payload.token)
    email = claims["sub"]

    # Buscar usuário pelo email codificado no token
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    usuario = result.scalar_one_or_none()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido.",
        )

    # Verificar que o token armazenado bate (uso único)
    token_hash = hash_token(payload.token)
    if usuario.token_ativacao != token_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token já utilizado ou inválido.",
        )

    # Definir senha e limpar token (uso único)
    usuario.senha_hash = get_password_hash(payload.nova_senha)
    usuario.token_ativacao = None
    usuario.is_active = True

    await db.commit()

    return MensagemResponse(mensagem="Senha definida com sucesso! Você já pode fazer login.")


@router.post("/esqueci-senha", response_model=MensagemResponse)
async def esqueci_senha(payload: EsqueciSenhaRequest, db: AsyncSession = Depends(get_db)):
    """
    Solicita recuperação de senha via matrícula.
    SEMPRE retorna HTTP 200 com mensagem genérica para prevenir enumeração de usuários.
    """
    matricula_limpa = sanitize_matricula(payload.matricula)

    # Buscar usuário pela matrícula
    result = await db.execute(select(Usuario).where(Usuario.matricula == matricula_limpa))
    usuario = result.scalar_one_or_none()

    mensagem_generica = "Se a matrícula informada estiver cadastrada, um e-mail de recuperação será enviado."

    if usuario and usuario.is_active:
        # Buscar e-mail: preferir email do usuario, depois do servidor vinculado
        email_destino = usuario.email

        if email_destino:
            # Gerar token de reset
            token = create_activation_token(email_destino, purpose="reset")
            usuario.token_ativacao = hash_token(token)
            await db.commit()

            # Enviar e-mail (ou logar no console em modo DEV)
            enviar_email_reset(email_destino, usuario.nome, token)

    # Sempre retorna 200 (anti-enumeração)
    return MensagemResponse(mensagem=mensagem_generica)


@router.get("/me", response_model=UsuarioMeResponse)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    """
    Retorna os dados do usuário autenticado, incluindo o Servidor vinculado
    (se houver). Útil para o front-end montar o perfil e controlar permissões.
    """
    return UsuarioMeResponse.model_validate(current_user)
