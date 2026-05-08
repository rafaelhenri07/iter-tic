"""
ITER TIC - Rotas de Gestão de Usuários (exclusivo ADMIN)

Todas as rotas são protegidas pela dependência `require_admin`.
A "deleção" é um Soft Delete (is_active=False) para preservar o histórico de auditoria.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.usuario import Usuario
from app.models.enums import RoleUsuarioEnum
from app.core.security import require_admin, get_password_hash
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioAdminResponse

router = APIRouter(prefix="/usuarios", tags=["Admin — Usuários"])


@router.get("", response_model=List[UsuarioAdminResponse])
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_admin),
):
    """Lista todos os usuários cadastrados (somente ADMIN)."""
    result = await db.execute(
        select(Usuario).order_by(Usuario.criado_em.desc())
    )
    return result.scalars().all()


@router.post("", response_model=UsuarioAdminResponse, status_code=status.HTTP_201_CREATED)
async def criar_usuario(
    payload: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_admin),
):
    """Cria um novo usuário/acesso no sistema (somente ADMIN)."""
    # Verifica se e-mail já existe
    existing = await db.execute(select(Usuario).where(Usuario.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um usuário com o e-mail '{payload.email}'.",
        )

    # Valida role
    try:
        role = RoleUsuarioEnum(payload.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Role inválido. Use 'ADMIN' ou 'COMUM'.",
        )

    novo = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha_hash=get_password_hash(payload.senha),
        role=role,
        is_active=True,
        servidor_id=payload.servidor_id,
    )
    db.add(novo)
    await db.commit()
    await db.refresh(novo)
    return novo


@router.put("/{usuario_id}", response_model=UsuarioAdminResponse)
async def atualizar_usuario(
    usuario_id: int,
    payload: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """Atualiza role, status ativo ou servidor vinculado (somente ADMIN)."""
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Impede que o admin remova a si mesmo
    if usuario.id == admin.id and payload.role == "COMUM":
        raise HTTPException(
            status_code=400,
            detail="Você não pode rebaixar sua própria conta de ADMIN para COMUM.",
        )

    if payload.nome is not None:
        usuario.nome = payload.nome
    if payload.role is not None:
        try:
            usuario.role = RoleUsuarioEnum(payload.role)
        except ValueError:
            raise HTTPException(status_code=422, detail="Role inválido.")
    if payload.is_active is not None:
        usuario.is_active = payload.is_active
    if payload.servidor_id is not None:
        usuario.servidor_id = payload.servidor_id

    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desativar_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """
    Soft Delete: marca o usuário como inativo (is_active=False).
    O registro é preservado para manter a consistência do histórico de auditoria.
    """
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if usuario.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode desativar sua própria conta.",
        )

    usuario.is_active = False
    await db.commit()
