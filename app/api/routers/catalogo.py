"""
ITER TIC — Rotas do Catálogo de Produtos/Serviços de TI

CRUD básico + listagem enriquecida com inteligência de relacionamento
(portfólio de fornecedores e histórico de contratações).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.catalogo import CatalogoProduto
from app.models.fornecedor import Fornecedor, fornecedor_catalogo
from app.models.contrato import Contrato, ItemContrato
from app.schemas.catalogo import (
    CatalogoProdutoCreate,
    CatalogoProdutoUpdate,
    CatalogoProdutoResponse,
    CatalogoProdutoEnrichedResponse,
)

router = APIRouter(prefix="/catalogo", tags=["Catálogo de Produtos"])


@router.get(
    "",
    response_model=list[CatalogoProdutoEnrichedResponse],
    summary="Listar itens do catálogo com inteligência de relacionamento",
)
async def listar_catalogo(
    search: Optional[str] = Query(None, description="Busca textual por nome"),
    db: AsyncSession = Depends(get_db),
):
    # 1. Montar query base
    stmt = select(CatalogoProduto).order_by(CatalogoProduto.nome)
    if search:
        stmt = stmt.where(CatalogoProduto.nome.ilike(f"%{search}%"))
    items = (await db.execute(stmt)).scalars().all()

    # 2. Para cada item, calcular dados de relacionamento
    result: list[CatalogoProdutoEnrichedResponse] = []

    for item in items:
        # 2a. Fornecedores vinculados via portfólio (N:N)
        stmt_portfolio = (
            select(Fornecedor.nome)
            .join(fornecedor_catalogo, fornecedor_catalogo.c.fornecedor_id == Fornecedor.id)
            .where(fornecedor_catalogo.c.catalogo_produto_id == item.id)
            .where(Fornecedor.is_deleted == False)  # noqa: E712
            .order_by(Fornecedor.nome)
        )
        portfolio_result = await db.execute(stmt_portfolio)
        fornecedores_vinculados = [row[0] for row in portfolio_result.all()]

        # 2b. Fornecedores contratados (via ItemContrato → Contrato → Fornecedor)
        stmt_contratados = (
            select(Fornecedor.nome)
            .select_from(ItemContrato)
            .join(Contrato, Contrato.id == ItemContrato.contrato_id)
            .join(Fornecedor, Fornecedor.id == Contrato.fornecedor_id)
            .where(ItemContrato.catalogo_produto_id == item.id)
            .where(Fornecedor.is_deleted == False)  # noqa: E712
            .distinct()
            .order_by(Fornecedor.nome)
        )
        contratados_result = await db.execute(stmt_contratados)
        fornecedores_contratados = [row[0] for row in contratados_result.all()]

        result.append(
            CatalogoProdutoEnrichedResponse(
                id=item.id,
                nome=item.nome,
                tipo=item.tipo,
                criado_em=item.criado_em,
                atualizado_em=item.atualizado_em,
                fornecedores_vinculados=fornecedores_vinculados,
                ja_contratado=len(fornecedores_contratados) > 0,
                fornecedores_contratados=fornecedores_contratados,
            )
        )

    return result


@router.post(
    "",
    response_model=CatalogoProdutoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo item no catálogo",
)
async def criar_item_catalogo(
    payload: CatalogoProdutoCreate,
    db: AsyncSession = Depends(get_db),
):
    item = CatalogoProduto(nome=payload.nome, tipo=payload.tipo)
    db.add(item)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um item com o nome '{payload.nome}'.",
        )
    await db.refresh(item)
    return CatalogoProdutoResponse.model_validate(item)


@router.patch(
    "/{item_id}",
    response_model=CatalogoProdutoResponse,
    summary="Atualizar item do catálogo",
)
async def atualizar_item_catalogo(
    item_id: int,
    payload: CatalogoProdutoUpdate,
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(CatalogoProduto, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um item com o nome informado.",
        )
    await db.refresh(item)
    return CatalogoProdutoResponse.model_validate(item)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir item do catálogo",
)
async def excluir_item_catalogo(
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(CatalogoProduto, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    await db.delete(item)
    await db.flush()
