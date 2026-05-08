"""
ITER TIC — Rotas FastAPI: Empresas

CRUD completo com soft-delete. O DELETE seta is_deleted = True
e registra delete_time em vez de remover a linha do banco.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.empresa import Empresa
from app.schemas.empresa import (
    EmpresaCreate,
    EmpresaUpdate,
    EmpresaResponse,
    EmpresaResumo,
)

router = APIRouter(
    prefix="/empresas",
    tags=["Empresas"],
)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LISTAR EMPRESAS                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "",
    response_model=list[EmpresaResponse],
    summary="Listar todas as empresas",
    description="Retorna apenas empresas ativas (is_deleted = false), ordenadas por nome.",
)
async def listar_empresas(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Empresa)
        .where(Empresa.is_deleted == False)  # noqa: E712
        .order_by(Empresa.nome)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/resumo",
    response_model=list[EmpresaResumo],
    summary="Listar empresas (resumo para selects)",
    description="Retorna id + nome + cnpj — otimizado para selects relacionais.",
)
async def listar_empresas_resumo(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Empresa)
        .where(Empresa.is_deleted == False)  # noqa: E712
        .order_by(Empresa.nome)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OBTER EMPRESA POR ID                                                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{empresa_id}",
    response_model=EmpresaResponse,
    summary="Obter empresa por ID",
)
async def obter_empresa(
    empresa_id: int,
    db: AsyncSession = Depends(get_db),
):
    empresa = await db.get(Empresa, empresa_id)
    if not empresa or empresa.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa {empresa_id} não encontrada.",
        )
    return empresa


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CRIAR EMPRESA                                                         ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "",
    response_model=EmpresaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova empresa",
)
async def criar_empresa(
    payload: EmpresaCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verifica duplicidade de CNPJ
    stmt = select(Empresa).where(
        Empresa.cnpj == payload.cnpj,
        Empresa.is_deleted == False,  # noqa: E712
    )
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma empresa ativa com o CNPJ '{payload.cnpj}'.",
        )

    empresa = Empresa(**payload.model_dump())
    db.add(empresa)
    await db.flush()
    await db.refresh(empresa)
    return empresa


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ATUALIZAR EMPRESA                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/{empresa_id}",
    response_model=EmpresaResponse,
    summary="Atualizar empresa (parcial)",
)
async def atualizar_empresa(
    empresa_id: int,
    payload: EmpresaUpdate,
    db: AsyncSession = Depends(get_db),
):
    empresa = await db.get(Empresa, empresa_id)
    if not empresa or empresa.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa {empresa_id} não encontrada.",
        )

    # Verifica duplicidade de CNPJ (excluindo a própria empresa)
    if payload.cnpj:
        stmt = select(Empresa).where(
            Empresa.cnpj == payload.cnpj,
            Empresa.id != empresa_id,
            Empresa.is_deleted == False,  # noqa: E712
        )
        outra = (await db.execute(stmt)).scalar_one_or_none()
        if outra:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe outra empresa com o CNPJ '{payload.cnpj}'.",
            )

    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(empresa, campo, valor)

    await db.flush()
    await db.refresh(empresa)
    return empresa


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SOFT DELETE                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/{empresa_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir empresa (soft delete)",
    description=(
        "Marca a empresa como excluída (is_deleted = true) sem removê-la "
        "do banco de dados, preservando a rastreabilidade histórica."
    ),
)
async def excluir_empresa(
    empresa_id: int,
    db: AsyncSession = Depends(get_db),
):
    empresa = await db.get(Empresa, empresa_id)
    if not empresa or empresa.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa {empresa_id} não encontrada.",
        )

    empresa.is_deleted = True
    empresa.delete_time = datetime.now(timezone.utc)
    await db.flush()
