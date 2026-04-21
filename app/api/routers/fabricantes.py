"""
ITER TIC — Rotas FastAPI: Fabricantes

CRUD completo com soft-delete. O DELETE seta is_deleted = True
e registra delete_time em vez de remover a linha do banco.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.fabricante import Fabricante
from app.schemas.fabricante import (
    FabricanteCreate,
    FabricanteUpdate,
    FabricanteResponse,
)

router = APIRouter(
    prefix="/fabricantes",
    tags=["Fabricantes"],
)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LISTAR FABRICANTES                                                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "",
    response_model=list[FabricanteResponse],
    summary="Listar todos os fabricantes",
    description="Retorna apenas fabricantes ativos (is_deleted = false), ordenados por nome.",
)
async def listar_fabricantes(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Fabricante)
        .where(Fabricante.is_deleted == False)  # noqa: E712
        .order_by(Fabricante.nome)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OBTER FABRICANTE POR ID                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{fabricante_id}",
    response_model=FabricanteResponse,
    summary="Obter fabricante por ID",
)
async def obter_fabricante(
    fabricante_id: int,
    db: AsyncSession = Depends(get_db),
):
    fabricante = await db.get(Fabricante, fabricante_id)
    if not fabricante or fabricante.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fabricante {fabricante_id} não encontrado.",
        )
    return fabricante


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CRIAR FABRICANTE                                                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "",
    response_model=FabricanteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo fabricante",
)
async def criar_fabricante(
    payload: FabricanteCreate,
    db: AsyncSession = Depends(get_db),
):
    fabricante = Fabricante(**payload.model_dump())
    db.add(fabricante)
    await db.flush()
    await db.refresh(fabricante)
    return fabricante


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ATUALIZAR FABRICANTE                                                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/{fabricante_id}",
    response_model=FabricanteResponse,
    summary="Atualizar fabricante (parcial)",
)
async def atualizar_fabricante(
    fabricante_id: int,
    payload: FabricanteUpdate,
    db: AsyncSession = Depends(get_db),
):
    fabricante = await db.get(Fabricante, fabricante_id)
    if not fabricante or fabricante.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fabricante {fabricante_id} não encontrado.",
        )

    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(fabricante, campo, valor)

    await db.flush()
    await db.refresh(fabricante)
    return fabricante


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SOFT DELETE                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/{fabricante_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir fabricante (soft delete)",
    description=(
        "Marca o fabricante como excluído (is_deleted = true) sem removê-lo "
        "do banco de dados, preservando a rastreabilidade histórica."
    ),
)
async def excluir_fabricante(
    fabricante_id: int,
    db: AsyncSession = Depends(get_db),
):
    fabricante = await db.get(Fabricante, fabricante_id)
    if not fabricante or fabricante.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fabricante {fabricante_id} não encontrado.",
        )

    fabricante.is_deleted = True
    fabricante.delete_time = func.now()
    await db.flush()
