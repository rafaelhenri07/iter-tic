"""
ITER TIC - Rotas: Estrutura Organizacional (Unificada)

CRUD único para a tabela unidades_organizacionais.
Listagem é pública (qualquer usuário autenticado); criação, edição e exclusão são restritas a admin.
Suporta hierarquia autorreferenciada com caminho_completo.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.security import require_admin
from app.models.estrutura_organizacional import UnidadeOrganizacional
from app.schemas.estrutura_organizacional import (
    UnidadeOrgCreate,
    UnidadeOrgUpdate,
    UnidadeOrgResponse,
)

router = APIRouter(
    prefix="/estrutura-organizacional",
    tags=["Estrutura Organizacional"],
)


def _recursive_selectinload(depth: int = 5):
    """Constrói chain de selectinload recursivo para carregar a árvore de pais."""
    opt = selectinload(UnidadeOrganizacional.unidade_pai)
    for _ in range(depth - 1):
        opt = opt.selectinload(UnidadeOrganizacional.unidade_pai)
    return opt


@router.get("/unidades", response_model=list[UnidadeOrgResponse],
            summary="Listar todas as unidades organizacionais")
async def listar_unidades(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UnidadeOrganizacional)
        .options(_recursive_selectinload())
        .order_by(UnidadeOrganizacional.nome)
    )
    unidades = result.scalars().all()
    # Ordenar por caminho_completo para agrupar hierarquicamente
    unidades_sorted = sorted(unidades, key=lambda u: u.caminho_completo)
    return [UnidadeOrgResponse.model_validate(u) for u in unidades_sorted]


@router.post("/unidades", response_model=UnidadeOrgResponse, status_code=201,
             dependencies=[Depends(require_admin)],
             summary="Criar nova unidade organizacional")
async def criar_unidade(payload: UnidadeOrgCreate, db: AsyncSession = Depends(get_db)):
    # Validar pai se fornecido
    if payload.unidade_pai_id is not None:
        pai = await db.get(UnidadeOrganizacional, payload.unidade_pai_id)
        if not pai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unidade pai com id={payload.unidade_pai_id} não encontrada.",
            )

    obj = UnidadeOrganizacional(
        nome=payload.nome,
        sigla=payload.sigla,
        unidade_pai_id=payload.unidade_pai_id,
    )
    db.add(obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma unidade com o nome '{payload.nome}'.",
        )
        
    # Recarregar o objeto com a árvore de pais para calcular o caminho_completo
    result = await db.execute(
        select(UnidadeOrganizacional)
        .options(_recursive_selectinload())
        .where(UnidadeOrganizacional.id == obj.id)
    )
    obj_full = result.scalars().first()
    return UnidadeOrgResponse.model_validate(obj_full)


@router.put("/unidades/{item_id}", response_model=UnidadeOrgResponse,
            dependencies=[Depends(require_admin)],
            summary="Atualizar unidade organizacional")
async def atualizar_unidade(
    item_id: int,
    payload: UnidadeOrgUpdate,
    db: AsyncSession = Depends(get_db),
):
    obj = await db.get(UnidadeOrganizacional, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")

    # Validar pai se fornecido
    if payload.unidade_pai_id is not None:
        if payload.unidade_pai_id == item_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uma unidade não pode ser pai de si mesma.",
            )
        # Verificar se o novo pai é descendente do próprio item (evitar ciclo)
        check_id = payload.unidade_pai_id
        while check_id is not None:
            if check_id == item_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Ciclo detectado: uma unidade não pode ter como pai um de seus próprios descendentes.",
                )
            parent_result = await db.execute(
                select(UnidadeOrganizacional.unidade_pai_id).where(UnidadeOrganizacional.id == check_id)
            )
            check_id = parent_result.scalar_one_or_none()

        pai = await db.get(UnidadeOrganizacional, payload.unidade_pai_id)
        if not pai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unidade pai com id={payload.unidade_pai_id} não encontrada.",
            )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflito: verifique se o nome já existe.",
        )
        
    # Recarregar o objeto com a árvore de pais para calcular o caminho_completo
    result = await db.execute(
        select(UnidadeOrganizacional)
        .options(_recursive_selectinload())
        .where(UnidadeOrganizacional.id == obj.id)
    )
    obj_full = result.scalars().first()
    return UnidadeOrgResponse.model_validate(obj_full)


@router.delete("/unidades/{item_id}", dependencies=[Depends(require_admin)],
               summary="Excluir unidade organizacional")
async def excluir_unidade(item_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(UnidadeOrganizacional, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    await db.delete(obj)
    await db.commit()
    return {"detail": "Excluído com sucesso."}
