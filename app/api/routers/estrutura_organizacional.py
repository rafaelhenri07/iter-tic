"""
ITER TIC - Rotas: Estrutura Organizacional (Unificada)

CRUD único para a tabela unidades_organizacionais.
Listagem é pública (qualquer usuário autenticado); criação e exclusão são restritas a admin.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.core.security import require_admin
from app.models.estrutura_organizacional import UnidadeOrganizacional
from app.schemas.estrutura_organizacional import UnidadeOrgCreate, UnidadeOrgResponse

router = APIRouter(
    prefix="/estrutura-organizacional",
    tags=["Estrutura Organizacional"],
)


@router.get("/unidades", response_model=list[UnidadeOrgResponse],
            summary="Listar todas as unidades organizacionais")
async def listar_unidades(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UnidadeOrganizacional).order_by(UnidadeOrganizacional.nome))
    return [UnidadeOrgResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/unidades", response_model=UnidadeOrgResponse, status_code=201,
             dependencies=[Depends(require_admin)],
             summary="Criar nova unidade organizacional")
async def criar_unidade(payload: UnidadeOrgCreate, db: AsyncSession = Depends(get_db)):
    obj = UnidadeOrganizacional(
        nome=payload.nome,  # já vem em MAIÚSCULAS via validator
        sigla=payload.sigla,
    )
    db.add(obj)
    try:
        await db.commit()
        await db.refresh(obj)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma unidade com o nome '{payload.nome}'.",
        )
    return UnidadeOrgResponse.model_validate(obj)


@router.delete("/unidades/{item_id}", dependencies=[Depends(require_admin)],
               summary="Excluir unidade organizacional")
async def excluir_unidade(item_id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(UnidadeOrganizacional, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    await db.delete(obj)
    await db.commit()
    return {"detail": "Excluído com sucesso."}
