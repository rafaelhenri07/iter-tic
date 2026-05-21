"""
ITER TIC — Rotas do Módulo de Fornecedores

CRUD completo com soft-delete e eager-load do portfólio (CatalogoProduto).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.fornecedor import Fornecedor
from app.models.catalogo import CatalogoProduto
from app.schemas.fornecedor import (
    FornecedorCreate,
    FornecedorUpdate,
    FornecedorResponse,
    FornecedorResumo,
)

router = APIRouter(prefix="/fornecedores", tags=["Fornecedores"])


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LISTAGEM                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "",
    response_model=list[FornecedorResponse],
    summary="Listar todos os fornecedores ativos",
)
async def listar_fornecedores(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Fornecedor)
        .options(selectinload(Fornecedor.portfolio))
        .where(Fornecedor.is_deleted == False)  # noqa: E712
        .order_by(Fornecedor.nome)
    )
    fornecedores = (await db.execute(stmt)).scalars().all()
    return [FornecedorResponse.model_validate(f) for f in fornecedores]


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  DETALHES                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{fornecedor_id}",
    response_model=FornecedorResponse,
    summary="Obter detalhes de um fornecedor",
)
async def obter_fornecedor(
    fornecedor_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Fornecedor)
        .options(selectinload(Fornecedor.portfolio))
        .where(Fornecedor.id == fornecedor_id, Fornecedor.is_deleted == False)  # noqa: E712
    )
    fornecedor = (await db.execute(stmt)).scalar_one_or_none()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
    return FornecedorResponse.model_validate(fornecedor)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CRIAÇÃO                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "",
    response_model=FornecedorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo fornecedor",
)
async def criar_fornecedor(
    payload: FornecedorCreate,
    db: AsyncSession = Depends(get_db),
):
    fornecedor = Fornecedor(
        nome=payload.nome,
        natureza=payload.natureza,
        documento=payload.documento,
        site=payload.site,
        email=payload.email,
        contatos=[c.model_dump() for c in payload.contatos],
    )

    # Carregar itens do catálogo para o portfólio
    if payload.portfolio_ids:
        stmt = select(CatalogoProduto).where(
            CatalogoProduto.id.in_(payload.portfolio_ids)
        )
        produtos = (await db.execute(stmt)).scalars().all()
        fornecedor.portfolio = list(produtos)

    db.add(fornecedor)
    await db.flush()
    await db.refresh(fornecedor)

    # Recarregar com portfolio eager-loaded
    return await _carregar_fornecedor(fornecedor.id, db)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ATUALIZAÇÃO                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/{fornecedor_id}",
    response_model=FornecedorResponse,
    summary="Atualizar fornecedor",
)
async def atualizar_fornecedor(
    fornecedor_id: int,
    payload: FornecedorUpdate,
    db: AsyncSession = Depends(get_db),
):
    fornecedor = await _garantir_existe(fornecedor_id, db)
    update_data = payload.model_dump(exclude_unset=True)

    portfolio_ids = update_data.pop("portfolio_ids", None)
    contatos_data = update_data.pop("contatos", None)

    for campo, valor in update_data.items():
        setattr(fornecedor, campo, valor)

    if contatos_data is not None:
        fornecedor.contatos = [c.model_dump() if hasattr(c, "model_dump") else c for c in contatos_data]

    if portfolio_ids is not None:
        if portfolio_ids:
            stmt = select(CatalogoProduto).where(
                CatalogoProduto.id.in_(portfolio_ids)
            )
            produtos = (await db.execute(stmt)).scalars().all()
            fornecedor.portfolio = list(produtos)
        else:
            fornecedor.portfolio = []

    await db.flush()
    return await _carregar_fornecedor(fornecedor_id, db)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SOFT DELETE                                                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/{fornecedor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir fornecedor (soft delete)",
)
async def excluir_fornecedor(
    fornecedor_id: int,
    db: AsyncSession = Depends(get_db),
):
    fornecedor = await _garantir_existe(fornecedor_id, db)
    
    # Verificar se o fornecedor possui contratos vinculados
    from app.models.contrato import Contrato
    stmt = select(Contrato.id).where(Contrato.fornecedor_id == fornecedor_id).limit(1)
    has_contratos = (await db.execute(stmt)).scalar_one_or_none()
    if has_contratos is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir este fornecedor, pois ele está vinculado a um ou mais contratos."
        )

    from datetime import datetime, timezone
    fornecedor.is_deleted = True
    fornecedor.delete_time = datetime.now(timezone.utc)
    await db.flush()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HELPERS                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _garantir_existe(fornecedor_id: int, db: AsyncSession) -> Fornecedor:
    fornecedor = await db.get(Fornecedor, fornecedor_id)
    if not fornecedor or fornecedor.is_deleted:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
    return fornecedor


async def _carregar_fornecedor(fornecedor_id: int, db: AsyncSession) -> FornecedorResponse:
    stmt = (
        select(Fornecedor)
        .options(selectinload(Fornecedor.portfolio))
        .where(Fornecedor.id == fornecedor_id)
    )
    fornecedor = (await db.execute(stmt)).scalar_one_or_none()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
    return FornecedorResponse.model_validate(fornecedor)
