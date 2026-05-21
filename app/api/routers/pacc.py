"""
ITER TIC - Rotas do módulo PACC (Plano Anual de Contratações)

Implementa o padrão SCD (Slowly Changing Dimension) de ciclo de vida,
espelhando a mesma arquitetura do módulo PDTIC:
  - CREATE: insere nova linha com revisao_inclusao_id
  - UPDATE: "fecha" a versão atual (revisao_exclusao_id) e insere nova versão
            com item_pai_id apontando para a anterior
  - DELETE: exclusão lógica via revisao_exclusao_id (soft-delete)
  - GET:    retorna todas as versões (ativas e excluídas) para timeline plana

Cada item do PACC é obrigatoriamente vinculado a uma AcaoPdtic,
garantindo rastreabilidade ponta-a-ponta com o planejamento plurianual.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.pacc import ExercicioPacc, ItemPacc, RevisaoPacc
from app.models.pdtic import AcaoPdtic
from app.models.estrutura_organizacional import UnidadeOrganizacional
from app.schemas.pacc import (
    PaccExercicioCreate,
    PaccExercicioComRevisoesResponse,
    PaccExercicioResponse,
    PaccExercicioUpdate,
    PaccItemComAcaoResponse,
    PaccItemComHistoricoResponse,
    PaccItemCreate,
    PaccItemExcluir,
    PaccItemResponse,
    PaccItemUpdate,
    PaccPainelResponse,
    PaccRevisaoCreate,
    PaccRevisaoResponse,
    PaccRevisaoUpdate,
)

router = APIRouter(prefix="/pacc", tags=["PACC"])


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  EXERCÍCIOS                                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/exercicios",
    response_model=list[PaccExercicioResponse],
    summary="Listar todos os exercícios PACC",
)
async def listar_exercicios(
    ativo: bool | None = Query(None, description="Filtrar por status ativo/inativo"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ExercicioPacc).order_by(ExercicioPacc.ano.desc())
    if ativo is not None:
        stmt = stmt.where(ExercicioPacc.ativo == ativo)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/exercicios",
    response_model=PaccExercicioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo exercício PACC (auto-cria Versão Inicial)",
)
async def criar_exercicio(
    payload: PaccExercicioCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verificar duplicidade (ano é unique)
    stmt = select(ExercicioPacc).where(ExercicioPacc.ano == payload.ano)
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um exercício PACC para o ano {payload.ano}.",
        )

    exercicio = ExercicioPacc(**payload.model_dump())
    db.add(exercicio)
    await db.flush()

    # Auto-criar Versão Inicial (numero_revisao=0)
    versao_inicial = RevisaoPacc(
        exercicio_id=exercicio.id,
        numero_revisao=0,
        descricao=f"Versão Inicial do PACC {payload.ano}",
    )
    db.add(versao_inicial)
    await db.flush()

    await db.refresh(exercicio)
    return exercicio


@router.post(
    "/exercicios/{exercicio_id}/gerar-revisao",
    response_model=PaccRevisaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Gerar nova revisão do PACC (SCD Row-Level — NÃO clona itens)",
    description=(
        "Cria uma nova RevisaoPacc com numero_revisao incrementado. "
        "Os itens NÃO são clonados — o controle é feito por "
        "revisao_inclusao_id / revisao_exclusao_id em cada item."
    ),
)
async def gerar_nova_revisao(
    exercicio_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_exercicio_existe(exercicio_id, db)

    # Descobrir o maior numero_revisao existente
    stmt = (
        select(RevisaoPacc.numero_revisao)
        .where(RevisaoPacc.exercicio_id == exercicio_id)
        .order_by(RevisaoPacc.numero_revisao.desc())
        .limit(1)
    )
    ultimo = (await db.execute(stmt)).scalar_one_or_none()
    proximo = (ultimo or 0) + 1

    nova_revisao = RevisaoPacc(
        exercicio_id=exercicio_id,
        numero_revisao=proximo,
        descricao=f"Revisão {proximo}",
    )
    db.add(nova_revisao)
    await db.flush()
    await db.refresh(nova_revisao)
    return nova_revisao


@router.get(
    "/exercicios/{exercicio_id}",
    response_model=PaccExercicioComRevisoesResponse,
    summary="Obter exercício com suas revisões",
)
async def obter_exercicio(
    exercicio_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ExercicioPacc)
        .options(selectinload(ExercicioPacc.revisoes))
        .where(ExercicioPacc.id == exercicio_id)
    )
    exercicio = (await db.execute(stmt)).scalar_one_or_none()
    if not exercicio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercício {exercicio_id} não encontrado.",
        )
    return exercicio


@router.patch(
    "/exercicios/{exercicio_id}",
    response_model=PaccExercicioResponse,
    summary="Atualizar exercício PACC",
)
async def atualizar_exercicio(
    exercicio_id: int,
    payload: PaccExercicioUpdate,
    db: AsyncSession = Depends(get_db),
):
    exercicio = await db.get(ExercicioPacc, exercicio_id)
    if not exercicio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercício {exercicio_id} não encontrado.",
        )

    dados = payload.model_dump(exclude_unset=True)

    # Se está atualizando o ano, verificar duplicidade
    if "ano" in dados and dados["ano"] != exercicio.ano:
        stmt = select(ExercicioPacc).where(ExercicioPacc.ano == dados["ano"])
        existente = (await db.execute(stmt)).scalar_one_or_none()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe um exercício PACC para o ano {dados['ano']}.",
            )

    for campo, valor in dados.items():
        setattr(exercicio, campo, valor)
    await db.flush()
    await db.refresh(exercicio)
    return exercicio


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  REVISÕES                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/exercicios/{exercicio_id}/revisoes",
    response_model=list[PaccRevisaoResponse],
    summary="Listar revisões de um exercício",
)
async def listar_revisoes(
    exercicio_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_exercicio_existe(exercicio_id, db)
    stmt = (
        select(RevisaoPacc)
        .where(RevisaoPacc.exercicio_id == exercicio_id)
        .order_by(RevisaoPacc.numero_revisao)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/exercicios/{exercicio_id}/revisoes",
    response_model=PaccRevisaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova revisão para um exercício",
)
async def criar_revisao(
    exercicio_id: int,
    payload: PaccRevisaoCreate,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_exercicio_existe(exercicio_id, db)

    # Forçar consistência com o path parameter
    if payload.exercicio_id != exercicio_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="exercicio_id no body deve coincidir com o da URL.",
        )

    # Verificar unicidade da revisão dentro do exercício
    stmt = select(RevisaoPacc).where(
        RevisaoPacc.exercicio_id == exercicio_id,
        RevisaoPacc.numero_revisao == payload.numero_revisao,
    )
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Revisão {payload.numero_revisao} já existe para este exercício.",
        )

    revisao = RevisaoPacc(**payload.model_dump())
    db.add(revisao)
    await db.flush()
    await db.refresh(revisao)
    return revisao


@router.patch(
    "/revisoes/{revisao_id}",
    response_model=PaccRevisaoResponse,
    summary="Atualizar dados de uma revisão",
)
async def atualizar_revisao(
    revisao_id: int,
    payload: PaccRevisaoUpdate,
    db: AsyncSession = Depends(get_db),
):
    revisao = await db.get(RevisaoPacc, revisao_id)
    if not revisao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revisão {revisao_id} não encontrada.",
        )
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(revisao, campo, valor)
    await db.flush()
    await db.refresh(revisao)
    return revisao


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITENS — CONSULTA                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{exercicio_id}/itens",
    response_model=list[PaccItemResponse],
    summary="Listar TODOS os itens de um exercício (timeline plana)",
    description=(
        "Retorna todas as versões de itens do exercício — ativos e excluídos — "
        "para alimentar a timeline plana do front-end com rastreabilidade total. "
        "Use o query parameter `apenas_ativos=true` para filtrar somente os vigentes."
    ),
)
async def listar_itens_do_exercicio(
    exercicio_id: int,
    apenas_ativos: bool = Query(
        False,
        description="Se True, retorna apenas itens sem revisao_exclusao_id.",
    ),
    db: AsyncSession = Depends(get_db),
):
    await _garantir_exercicio_existe(exercicio_id, db)

    stmt = (
        select(ItemPacc)
        .where(ItemPacc.exercicio_id == exercicio_id)
        .order_by(ItemPacc.numero_item, ItemPacc.id)
    )
    if apenas_ativos:
        stmt = stmt.where(ItemPacc.revisao_exclusao_id.is_(None))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/itens/{item_id}",
    response_model=PaccItemComHistoricoResponse,
    summary="Obter um item com dados das revisões e ação PDTIC vinculadas",
)
async def obter_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ItemPacc)
        .options(
            selectinload(ItemPacc.revisao_inclusao),
            selectinload(ItemPacc.revisao_exclusao),
            selectinload(ItemPacc.acao_pdtic)
            .selectinload(AcaoPdtic.departamentos_rel)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(ItemPacc.acao_pdtic)
            .selectinload(AcaoPdtic.unidades_demandantes_rel)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(ItemPacc.acao_pdtic)
            .selectinload(AcaoPdtic.unidades_responsaveis_rel)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(ItemPacc.id == item_id)
    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} não encontrado.",
        )
    return item


@router.get(
    "/{exercicio_id}/painel",
    response_model=PaccPainelResponse,
    summary="Painel completo de um exercício (revisões + itens com filtro de auditoria)",
    description=(
        "Retorna exercício, revisões e itens. "
        "Use `filtro_auditoria` para controlar a visão: "
        "'vigentes' (default), 'todas', 'adicionadas' ou 'removidas'. "
        "Quando `revisao_id` é informado, os filtros 'adicionadas'/'removidas' "
        "consideram apenas essa revisão específica."
    ),
)
async def obter_painel_exercicio(
    exercicio_id: int,
    revisao_id: int | None = Query(None, description="Filtrar por revisão específica"),
    filtro_auditoria: str = Query(
        "vigentes",
        description="'vigentes' | 'todas' | 'adicionadas' | 'removidas'",
    ),
    db: AsyncSession = Depends(get_db),
):
    # Buscar exercício
    exercicio = await db.get(ExercicioPacc, exercicio_id)
    if not exercicio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercício {exercicio_id} não encontrado.",
        )

    # Revisões
    stmt_rev = (
        select(RevisaoPacc)
        .where(RevisaoPacc.exercicio_id == exercicio_id)
        .order_by(RevisaoPacc.numero_revisao)
    )
    revisoes = (await db.execute(stmt_rev)).scalars().all()

    # Itens — todos do exercício, com ação PDTIC e suas sub-relações eager-loaded
    stmt_itens = (
        select(ItemPacc)
        .options(
            selectinload(ItemPacc.acao_pdtic)
            .selectinload(AcaoPdtic.departamentos_rel)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(ItemPacc.acao_pdtic)
            .selectinload(AcaoPdtic.unidades_demandantes_rel)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(ItemPacc.acao_pdtic)
            .selectinload(AcaoPdtic.unidades_responsaveis_rel)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(ItemPacc.exercicio_id == exercicio_id)
        .order_by(ItemPacc.numero_item, ItemPacc.id)
    )
    todos_itens = (await db.execute(stmt_itens)).scalars().all()

    # Aplicar filtro de auditoria
    if filtro_auditoria == "adicionadas" and revisao_id:
        itens_ativos = [i for i in todos_itens if i.revisao_inclusao_id == revisao_id]
        itens_excluidos = []
    elif filtro_auditoria == "removidas" and revisao_id:
        itens_ativos = []
        itens_excluidos = [i for i in todos_itens if i.revisao_exclusao_id == revisao_id]
    elif filtro_auditoria == "todas":
        itens_ativos = [i for i in todos_itens if i.revisao_exclusao_id is None]
        itens_excluidos = [i for i in todos_itens if i.revisao_exclusao_id is not None]
    else:  # "vigentes" (default)
        itens_ativos = [i for i in todos_itens if i.revisao_exclusao_id is None]
        itens_excluidos = []
    return PaccPainelResponse(
        exercicio=exercicio,
        revisoes=revisoes,
        itens_ativos=itens_ativos,
        itens_excluidos=itens_excluidos,
    )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITENS — CRIAÇÃO                                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "/itens",
    response_model=PaccItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo item PACC",
    description=(
        "Insere um novo item vinculado a um exercício, uma revisão de inclusão "
        "e uma ação do PDTIC. Para registrar um item que é evolução de outro, "
        "informe `item_pai_id`."
    ),
)
async def criar_item(
    payload: PaccItemCreate,
    db: AsyncSession = Depends(get_db),
):
    # Validar existência do exercício
    await _garantir_exercicio_existe(payload.exercicio_id, db)

    # Validar existência da revisão e que pertence ao exercício
    await _garantir_revisao_existe_e_pertence(
        payload.revisao_inclusao_id, payload.exercicio_id, db
    )

    # Validar existência da ação PDTIC vinculada
    await _garantir_acao_pdtic_existe(payload.acao_pdtic_id, db)

    # Validar item_pai se informado
    if payload.item_pai_id is not None:
        item_pai = await db.get(ItemPacc, payload.item_pai_id)
        if not item_pai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item pai {payload.item_pai_id} não encontrado.",
            )
        if item_pai.exercicio_id != payload.exercicio_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="item_pai_id deve pertencer ao mesmo exercício.",
            )

    novo_item = ItemPacc(**payload.model_dump())
    db.add(novo_item)
    await db.flush()
    await db.refresh(novo_item)
    return novo_item


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITENS — ATUALIZAÇÃO (SCD: fechar versão atual + criar nova)            ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/itens/{item_id}",
    response_model=PaccItemResponse,
    summary="Atualizar item PACC (SCD — cria nova versão)",
    description=(
        "Implementa o padrão SCD de versionamento:\n\n"
        "1. Marca o item atual como excluído na revisão informada "
        "(`revisao_exclusao_id`).\n"
        "2. Insere uma **nova linha** com os dados atualizados, vinculando "
        "`item_pai_id` ao item antigo e `revisao_inclusao_id` à nova revisão.\n\n"
        "O `revisao_id` no query parameter identifica a revisão que motiva a alteração."
    ),
)
async def atualizar_item_scd(
    item_id: int,
    payload: PaccItemUpdate,
    revisao_id: int = Query(
        ...,
        description="ID da revisão que está motivando esta alteração.",
    ),
    db: AsyncSession = Depends(get_db),
):
    # ── 1. Localizar item atual ─────────────────────────────────────────────
    item_atual = await db.get(ItemPacc, item_id)
    if not item_atual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} não encontrado.",
        )

    # Verificar se já está excluído
    if item_atual.revisao_exclusao_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Item {item_id} já foi excluído na revisão "
                f"{item_atual.revisao_exclusao_id}. Não é possível alterá-lo."
            ),
        )

    # ── 2. Validar a revisão motivadora ─────────────────────────────────────
    await _garantir_revisao_existe_e_pertence(
        revisao_id, item_atual.exercicio_id, db
    )

    # A revisão motivadora não pode ser a mesma de inclusão original
    if revisao_id == item_atual.revisao_inclusao_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "A revisão motivadora da alteração deve ser diferente "
                "da revisão de inclusão original do item."
            ),
        )

    # ── 3. Validar acao_pdtic_id se alterada ────────────────────────────────
    dados_atualizados = payload.model_dump(exclude_unset=True)
    if "acao_pdtic_id" in dados_atualizados:
        await _garantir_acao_pdtic_existe(dados_atualizados["acao_pdtic_id"], db)

    # ── 4. Fechar a versão atual (soft-close) ───────────────────────────────
    item_atual.revisao_exclusao_id = revisao_id

    # ── 5. Criar nova versão com dados mesclados ────────────────────────────
    campos_negocio = [
        "numero_item",
        "descricao_demanda",
        "quantidade",
        "valor_estimado",
        "processo_sei",
        "acao_pdtic_id",
    ]

    dados_nova_versao: dict = {}
    for campo in campos_negocio:
        dados_nova_versao[campo] = getattr(item_atual, campo)

    # Sobrescrever com os campos enviados no payload (partial update)
    dados_nova_versao.update(dados_atualizados)

    # Campos de ciclo de vida
    dados_nova_versao["exercicio_id"] = item_atual.exercicio_id
    dados_nova_versao["revisao_inclusao_id"] = revisao_id
    dados_nova_versao["revisao_exclusao_id"] = None
    dados_nova_versao["item_pai_id"] = item_atual.id

    novo_item = ItemPacc(**dados_nova_versao)
    db.add(novo_item)

    await db.flush()
    await db.refresh(novo_item)
    return novo_item


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITENS — EXCLUSÃO LÓGICA (soft-delete via revisão)                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/itens/{item_id}",
    response_model=PaccItemResponse,
    summary="Excluir item PACC (exclusão lógica)",
    description=(
        "Não realiza hard-delete. Marca o item como excluído preenchendo "
        "`revisao_exclusao_id` com a revisão informada. O item permanece "
        "no banco para fins de histórico e rastreabilidade."
    ),
)
async def excluir_item_logicamente(
    item_id: int,
    payload: PaccItemExcluir,
    db: AsyncSession = Depends(get_db),
):
    # ── 1. Localizar item ───────────────────────────────────────────────────
    item = await db.get(ItemPacc, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} não encontrado.",
        )

    # Já excluído?
    if item.revisao_exclusao_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Item {item_id} já foi excluído na revisão "
                f"{item.revisao_exclusao_id}."
            ),
        )

    # ── 2. Validar a revisão de exclusão ────────────────────────────────────
    await _garantir_revisao_existe_e_pertence(
        payload.revisao_exclusao_id, item.exercicio_id, db
    )

    # ── 3. Marcar como excluído ─────────────────────────────────────────────
    item.revisao_exclusao_id = payload.revisao_exclusao_id

    await db.flush()
    await db.refresh(item)
    return item


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ITENS — EXCLUSÃO DEFINITIVA (hard-delete — erro de cadastro)           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/itens/{item_id}/definitivo",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir item PACC definitivamente (hard-delete)",
    description=(
        "Remove o item permanentemente do banco de dados. "
        "Use APENAS para corrigir ERROS DE CADASTRO. "
        "Para itens cancelados em revisão oficial, utilize DELETE /itens/{item_id} (exclusão lógica)."
    ),
)
async def excluir_item_definitivamente(
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(ItemPacc, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} não encontrado.",
        )

    await db.delete(item)
    await db.flush()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Helpers internos                                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _garantir_exercicio_existe(
    exercicio_id: int, db: AsyncSession
) -> ExercicioPacc:
    """Retorna o exercício ou levanta 404."""
    exercicio = await db.get(ExercicioPacc, exercicio_id)
    if not exercicio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercício {exercicio_id} não encontrado.",
        )
    return exercicio


async def _garantir_revisao_existe_e_pertence(
    revisao_id: int,
    exercicio_id: int,
    db: AsyncSession,
) -> RevisaoPacc:
    """Retorna a revisão se existir e pertencer ao exercício, ou levanta erro."""
    revisao = await db.get(RevisaoPacc, revisao_id)
    if not revisao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revisão {revisao_id} não encontrada.",
        )
    if revisao.exercicio_id != exercicio_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Revisão {revisao_id} pertence ao exercício {revisao.exercicio_id}, "
                f"não ao exercício {exercicio_id}."
            ),
        )
    return revisao


async def _garantir_acao_pdtic_existe(
    acao_pdtic_id: int, db: AsyncSession
) -> AcaoPdtic:
    """Valida que a ação PDTIC referenciada existe e está ativa."""
    acao = await db.get(AcaoPdtic, acao_pdtic_id)
    if not acao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ação PDTIC {acao_pdtic_id} não encontrada.",
        )
    if acao.revisao_exclusao_id is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Ação PDTIC {acao_pdtic_id} está logicamente excluída "
                f"(revisão {acao.revisao_exclusao_id}). "
                "Não é possível vincular novos itens a uma ação inativa."
            ),
        )
    return acao
