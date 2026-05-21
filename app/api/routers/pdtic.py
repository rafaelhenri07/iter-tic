"""
ITER TIC - Rotas do módulo PDTIC (Planejamento Estratégico)

Implementa o padrão SCD (Slowly Changing Dimension) de ciclo de vida:
  - CREATE: insere nova linha com revisao_inclusao_id
  - UPDATE: "fecha" a versão atual (revisao_exclusao_id) e insere nova versão
            com acao_pai_id apontando para a anterior
  - DELETE: exclusão lógica via revisao_exclusao_id (soft-delete)
  - GET:    retorna todas as versões (ativas e excluídas) para timeline plana
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.pdtic import AcaoPdtic, PeriodoPdtic, RevisaoPdtic
from app.models.estrutura_organizacional import UnidadeOrganizacional
from app.schemas.pdtic import (
    PdticAcaoCreate,
    PdticAcaoExcluir,
    PdticAcaoResponse,
    PdticAcaoComHistoricoResponse,
    PdticAcaoUpdate,
    PdticPainelResponse,
    PdticPeriodoCreate,
    PdticPeriodoResponse,
    PdticPeriodoComRevisoesResponse,
    PdticPeriodoUpdate,
    PdticRevisaoCreate,
    PdticRevisaoResponse,
    PdticRevisaoUpdate,
)

router = APIRouter(prefix="/pdtic", tags=["PDTIC"])


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PERÍODOS                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/periodos",
    response_model=list[PdticPeriodoResponse],
    summary="Listar todos os períodos PDTIC",
)
async def listar_periodos(
    ativo: bool | None = Query(None, description="Filtrar por status ativo/inativo"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PeriodoPdtic).order_by(PeriodoPdtic.ano_inicio.desc())
    if ativo is not None:
        stmt = stmt.where(PeriodoPdtic.ativo == ativo)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/periodos",
    response_model=PdticPeriodoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo período PDTIC (auto-cria Versão Inicial)",
)
async def criar_periodo(
    payload: PdticPeriodoCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verificar duplicidade
    stmt = select(PeriodoPdtic).where(
        PeriodoPdtic.ano_inicio == payload.ano_inicio,
        PeriodoPdtic.ano_fim == payload.ano_fim,
    )
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um período {payload.ano_inicio}-{payload.ano_fim}.",
        )

    periodo = PeriodoPdtic(**payload.model_dump())
    db.add(periodo)
    await db.flush()

    # Auto-criar Versão Inicial (numero_revisao=0)
    versao_inicial = RevisaoPdtic(
        periodo_id=periodo.id,
        numero_revisao=0,
        descricao=f"Versão Inicial do PDTIC {payload.ano_inicio}-{payload.ano_fim}",
    )
    db.add(versao_inicial)
    await db.flush()

    await db.refresh(periodo)
    return periodo


@router.post(
    "/periodos/{periodo_id}/gerar-revisao",
    response_model=PdticRevisaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Gerar nova revisão do PDTIC (SCD Row-Level — NÃO clona ações)",
    description=(
        "Cria uma nova RevisaoPdtic com numero_revisao incrementado. "
        "As ações NÃO são clonadas — o controle é feito por "
        "revisao_inclusao_id / revisao_exclusao_id em cada ação."
    ),
)
async def gerar_nova_revisao(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_periodo_existe(periodo_id, db)

    # Descobrir o maior numero_revisao existente
    stmt = (
        select(RevisaoPdtic.numero_revisao)
        .where(RevisaoPdtic.periodo_id == periodo_id)
        .order_by(RevisaoPdtic.numero_revisao.desc())
        .limit(1)
    )
    ultimo = (await db.execute(stmt)).scalar_one_or_none()
    proximo = (ultimo or 0) + 1

    nova_revisao = RevisaoPdtic(
        periodo_id=periodo_id,
        numero_revisao=proximo,
        descricao=f"Revisão {proximo}",
    )
    db.add(nova_revisao)
    await db.flush()
    await db.refresh(nova_revisao)
    return nova_revisao


@router.get(
    "/periodos/{periodo_id}",
    response_model=PdticPeriodoComRevisoesResponse,
    summary="Obter período com suas revisões",
)
async def obter_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(PeriodoPdtic)
        .options(selectinload(PeriodoPdtic.revisoes))
        .where(PeriodoPdtic.id == periodo_id)
    )
    periodo = (await db.execute(stmt)).scalar_one_or_none()
    if not periodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Período {periodo_id} não encontrado.",
        )
    return periodo


@router.patch(
    "/periodos/{periodo_id}",
    response_model=PdticPeriodoResponse,
    summary="Atualizar período PDTIC",
)
async def atualizar_periodo(
    periodo_id: int,
    payload: PdticPeriodoUpdate,
    db: AsyncSession = Depends(get_db),
):
    periodo = await db.get(PeriodoPdtic, periodo_id)
    if not periodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Período {periodo_id} não encontrado.",
        )
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(periodo, campo, valor)
    await db.flush()
    await db.refresh(periodo)
    return periodo


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  REVISÕES                                                               ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/periodos/{periodo_id}/revisoes",
    response_model=list[PdticRevisaoResponse],
    summary="Listar revisões de um período",
)
async def listar_revisoes(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_periodo_existe(periodo_id, db)
    stmt = (
        select(RevisaoPdtic)
        .where(RevisaoPdtic.periodo_id == periodo_id)
        .order_by(RevisaoPdtic.numero_revisao)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/periodos/{periodo_id}/revisoes",
    response_model=PdticRevisaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova revisão para um período",
)
async def criar_revisao(
    periodo_id: int,
    payload: PdticRevisaoCreate,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_periodo_existe(periodo_id, db)

    # Forçar consistência com o path parameter
    if payload.periodo_id != periodo_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="periodo_id no body deve coincidir com o da URL.",
        )

    # Verificar unicidade da revisão dentro do período
    stmt = select(RevisaoPdtic).where(
        RevisaoPdtic.periodo_id == periodo_id,
        RevisaoPdtic.numero_revisao == payload.numero_revisao,
    )
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Revisão {payload.numero_revisao} já existe para este período.",
        )

    revisao = RevisaoPdtic(**payload.model_dump())
    db.add(revisao)
    await db.flush()
    await db.refresh(revisao)
    return revisao


@router.patch(
    "/revisoes/{revisao_id}",
    response_model=PdticRevisaoResponse,
    summary="Atualizar dados de uma revisão",
)
async def atualizar_revisao(
    revisao_id: int,
    payload: PdticRevisaoUpdate,
    db: AsyncSession = Depends(get_db),
):
    revisao = await db.get(RevisaoPdtic, revisao_id)
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
# ║  AÇÕES — CONSULTA                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{periodo_id}/acoes",
    response_model=list[PdticAcaoResponse],
    summary="Listar TODAS as ações de um período (timeline plana)",
    description=(
        "Retorna todas as versões de ações do período — ativas e excluídas — "
        "para alimentar a timeline plana do front-end com rastreabilidade total. "
        "Use o query parameter `apenas_ativas=true` para filtrar somente as vigentes."
    ),
)
async def listar_acoes_do_periodo(
    periodo_id: int,
    apenas_ativas: bool = Query(
        False,
        description="Se True, retorna apenas ações sem revisao_exclusao_id.",
    ),
    db: AsyncSession = Depends(get_db),
):
    await _garantir_periodo_existe(periodo_id, db)

    stmt = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.periodo_id == periodo_id)
        .order_by(AcaoPdtic.codigo_acao, AcaoPdtic.id)
    )
    if apenas_ativas:
        stmt = stmt.where(AcaoPdtic.revisao_exclusao_id.is_(None))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/acoes/{acao_id}",
    response_model=PdticAcaoComHistoricoResponse,
    summary="Obter uma ação com dados das revisões vinculadas",
)
async def obter_acao(
    acao_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.revisao_inclusao),
            selectinload(AcaoPdtic.revisao_exclusao),
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.id == acao_id)
    )
    acao = (await db.execute(stmt)).scalar_one_or_none()
    if not acao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ação {acao_id} não encontrada.",
        )
    return acao


@router.get(
    "/{periodo_id}/painel",
    response_model=PdticPainelResponse,
    summary="Painel completo de um período (revisões + ações com filtro de auditoria)",
    description=(
        "Retorna período, revisões e ações. "
        "Use `filtro_auditoria` para controlar a visão: "
        "'vigentes' (default), 'todas', 'adicionadas' ou 'removidas'. "
        "Quando `revisao_id` é informado, os filtros 'adicionadas'/'removidas' "
        "consideram apenas essa revisão específica."
    ),
)
async def obter_painel_periodo(
    periodo_id: int,
    revisao_id: int | None = Query(None, description="Filtrar por revisão específica"),
    filtro_auditoria: str = Query(
        "vigentes",
        description="'vigentes' | 'todas' | 'adicionadas' | 'removidas'",
    ),
    db: AsyncSession = Depends(get_db),
):
    # Buscar período
    periodo = await db.get(PeriodoPdtic, periodo_id)
    if not periodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Período {periodo_id} não encontrado.",
        )

    # Revisões
    stmt_rev = (
        select(RevisaoPdtic)
        .where(RevisaoPdtic.periodo_id == periodo_id)
        .order_by(RevisaoPdtic.numero_revisao)
    )
    revisoes = (await db.execute(stmt_rev)).scalars().all()

    # Ações — todas do período
    stmt_acoes = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.periodo_id == periodo_id)
        .order_by(AcaoPdtic.codigo_acao, AcaoPdtic.id)
    )
    todas_acoes = (await db.execute(stmt_acoes)).scalars().all()

    # Aplicar filtro de auditoria
    if filtro_auditoria == "adicionadas" and revisao_id:
        acoes_ativas = [a for a in todas_acoes if a.revisao_inclusao_id == revisao_id]
        acoes_excluidas = []
    elif filtro_auditoria == "removidas" and revisao_id:
        acoes_ativas = []
        acoes_excluidas = [a for a in todas_acoes if a.revisao_exclusao_id == revisao_id]
    elif filtro_auditoria == "todas":
        acoes_ativas = [a for a in todas_acoes if a.revisao_exclusao_id is None]
        acoes_excluidas = [a for a in todas_acoes if a.revisao_exclusao_id is not None]
    else:  # "vigentes" (default)
        acoes_ativas = [a for a in todas_acoes if a.revisao_exclusao_id is None]
        acoes_excluidas = []

    return PdticPainelResponse(
        periodo=periodo,
        revisoes=revisoes,
        acoes_ativas=acoes_ativas,
        acoes_excluidas=acoes_excluidas,
    )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  AÇÕES — CRIAÇÃO                                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "/acoes",
    response_model=PdticAcaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar nova ação PDTIC",
    description=(
        "Insere uma nova ação vinculada a um período e a uma revisão de inclusão. "
        "Para registrar uma ação que é evolução de outra, informe `acao_pai_id`."
    ),
)
async def criar_acao(
    payload: PdticAcaoCreate,
    db: AsyncSession = Depends(get_db),
):
    # Validar existência do período
    await _garantir_periodo_existe(payload.periodo_id, db)

    # Validar existência da revisão e que pertence ao período
    revisao = await _garantir_revisao_existe_e_pertence(
        payload.revisao_inclusao_id, payload.periodo_id, db
    )

    # Validar acao_pai se informada
    if payload.acao_pai_id is not None:
        acao_pai = await db.get(AcaoPdtic, payload.acao_pai_id)
        if not acao_pai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ação pai {payload.acao_pai_id} não encontrada.",
            )
        if acao_pai.periodo_id != payload.periodo_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="acao_pai_id deve pertencer ao mesmo período.",
            )

    nova_acao = AcaoPdtic(
        **payload.model_dump(exclude={"departamentos_ids", "unidades_demandantes_ids", "unidades_responsaveis_ids"})
    )

    # Resolver relacionamentos N:N (todos usam a tabela unificada)
    deps = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(payload.departamentos_ids)))).scalars().all()
    dems = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(payload.unidades_demandantes_ids)))).scalars().all()
    resps = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(payload.unidades_responsaveis_ids)))).scalars().all()

    nova_acao.departamentos_rel = list(deps)
    nova_acao.unidades_demandantes_rel = list(dems)
    nova_acao.unidades_responsaveis_rel = list(resps)

    db.add(nova_acao)
    await db.flush()

    # Recarregar a ação com eager-loading completo das unidades + cadeia pai
    # (necessário para serializar caminho_completo sem lazy-load assíncrono)
    _unidade_com_pais = selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai)
    stmt = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.id == nova_acao.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  AÇÕES — EDIÇÃO SIMPLES (update in-place, sem SCD)                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.put(
    "/acoes/{acao_id}/editar-simples",
    response_model=PdticAcaoResponse,
    summary="Editar ação PDTIC (correção simples — sem versionamento)",
    description=(
        "Atualiza os campos da ação diretamente no registro existente, "
        "sem criar nova versão. Use para corrigir erros de digitação "
        "e pequenos ajustes que não justificam uma revisão oficial."
    ),
)
async def editar_acao_simples(
    acao_id: int,
    payload: PdticAcaoUpdate,
    db: AsyncSession = Depends(get_db),
):
    acao = await db.get(AcaoPdtic, acao_id)
    if not acao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ação {acao_id} não encontrada.",
        )

    if acao.revisao_exclusao_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ação {acao_id} já foi desativada. Não é possível editá-la.",
        )

    # Aplicar campos enviados (partial update in-place)
    dados = payload.model_dump(exclude_unset=True)
    dep_ids = dados.pop("departamentos_ids", None)
    dem_ids = dados.pop("unidades_demandantes_ids", None)
    resp_ids = dados.pop("unidades_responsaveis_ids", None)

    for campo, valor in dados.items():
        setattr(acao, campo, valor)

    # Resolver N:N se enviados
    if dep_ids is not None:
        deps = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(dep_ids)))).scalars().all()
        acao.departamentos_rel = list(deps)
    if dem_ids is not None:
        dems = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(dem_ids)))).scalars().all()
        acao.unidades_demandantes_rel = list(dems)
    if resp_ids is not None:
        resps = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(resp_ids)))).scalars().all()
        acao.unidades_responsaveis_rel = list(resps)

    await db.flush()

    # Recarregar com eager-loading
    stmt = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.id == acao.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  AÇÕES — ATUALIZAÇÃO (SCD: fechar versão atual + criar nova)            ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/acoes/{acao_id}",
    response_model=PdticAcaoResponse,
    summary="Atualizar ação PDTIC (SCD — cria nova versão)",
    description=(
        "Implementa o padrão SCD de versionamento:\n\n"
        "1. Marca a ação atual como excluída na revisão informada "
        "(`revisao_exclusao_id`).\n"
        "2. Insere uma **nova linha** com os dados atualizados, vinculando "
        "`acao_pai_id` à ação antiga e `revisao_inclusao_id` à nova revisão.\n\n"
        "O `revisao_id` no query parameter identifica a revisão que motiva a alteração."
    ),
)
async def atualizar_acao_scd(
    acao_id: int,
    payload: PdticAcaoUpdate,
    revisao_id: int = Query(
        ...,
        description="ID da revisão que está motivando esta alteração.",
    ),
    db: AsyncSession = Depends(get_db),
):
    # ── 1. Localizar ação atual ─────────────────────────────────────────────
    acao_atual = await db.get(AcaoPdtic, acao_id)
    if not acao_atual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ação {acao_id} não encontrada.",
        )

    # Verificar se já está excluída
    if acao_atual.revisao_exclusao_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Ação {acao_id} já foi excluída na revisão "
                f"{acao_atual.revisao_exclusao_id}. Não é possível alterá-la."
            ),
        )

    # ── 2. Validar a revisão motivadora ─────────────────────────────────────
    revisao = await _garantir_revisao_existe_e_pertence(
        revisao_id, acao_atual.periodo_id, db
    )

    # A revisão motivadora não pode ser a mesma de inclusão original
    if revisao_id == acao_atual.revisao_inclusao_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "A revisão motivadora da alteração deve ser diferente "
                "da revisão de inclusão original da ação."
            ),
        )

    # ── 3. Fechar a versão atual (soft-close) ───────────────────────────────
    acao_atual.revisao_exclusao_id = revisao_id

    # ── 4. Criar nova versão com dados mesclados ────────────────────────────
    # Copiar todos os campos de negócio da ação atual
    campos_negocio = [
        "codigo_acao",
        "departamento",
        "unidade_demandante",
        "unidade_responsavel",
        "necessidade",
        "descricao",
        "tipo_necessidade",
        "status",
        "meta",
        "indicador",
        "quantidade",
        "total_gut",
        "previsao_contratacao",
        "previsao_renovacao",
        "valores_investimento",
        "valores_custeio",
    ]

    dados_nova_versao: dict = {}
    for campo in campos_negocio:
        dados_nova_versao[campo] = getattr(acao_atual, campo)

    # Sobrescrever com os campos enviados no payload (partial update)
    dados_atualizados = payload.model_dump(exclude_unset=True)
    # Extrair IDs de org N:N do payload para tratamento especial
    dep_ids = dados_atualizados.pop("departamentos_ids", None)
    dem_ids = dados_atualizados.pop("unidades_demandantes_ids", None)
    resp_ids = dados_atualizados.pop("unidades_responsaveis_ids", None)
    dados_nova_versao.update(dados_atualizados)

    # Campos de ciclo de vida
    dados_nova_versao["periodo_id"] = acao_atual.periodo_id
    dados_nova_versao["revisao_inclusao_id"] = revisao_id
    dados_nova_versao["revisao_exclusao_id"] = None
    dados_nova_versao["acao_pai_id"] = acao_atual.id

    nova_acao = AcaoPdtic(**dados_nova_versao)

    # Resolver N:N — se o payload trouxe listas novas, usar; senão copiar da versão anterior
    if dep_ids is not None:
        deps = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(dep_ids)))).scalars().all()
        nova_acao.departamentos_rel = list(deps)
    else:
        nova_acao.departamentos_rel = list(acao_atual.departamentos_rel)

    if dem_ids is not None:
        dems = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(dem_ids)))).scalars().all()
        nova_acao.unidades_demandantes_rel = list(dems)
    else:
        nova_acao.unidades_demandantes_rel = list(acao_atual.unidades_demandantes_rel)

    if resp_ids is not None:
        resps = (await db.execute(select(UnidadeOrganizacional).where(UnidadeOrganizacional.id.in_(resp_ids)))).scalars().all()
        nova_acao.unidades_responsaveis_rel = list(resps)
    else:
        nova_acao.unidades_responsaveis_rel = list(acao_atual.unidades_responsaveis_rel)

    db.add(nova_acao)

    await db.flush()

    # Recarregar com eager-loading completo (cadeia pai para caminho_completo)
    stmt = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.id == nova_acao.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  AÇÕES — DESATIVAÇÃO (soft-delete via revisão — mantém histórico)       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.put(
    "/acoes/{acao_id}/desativar",
    response_model=PdticAcaoResponse,
    summary="Desativar ação PDTIC (cancelada pelo comitê — mantém histórico)",
    description=(
        "Marca a ação como desativada preenchendo `revisao_exclusao_id` "
        "com a revisão informada. A ação permanece no banco para fins "
        "de histórico e rastreabilidade."
    ),
)
async def desativar_acao(
    acao_id: int,
    payload: PdticAcaoExcluir,
    db: AsyncSession = Depends(get_db),
):
    # ── 1. Localizar ação ───────────────────────────────────────────────────
    acao = await db.get(AcaoPdtic, acao_id)
    if not acao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ação {acao_id} não encontrada.",
        )

    # Já desativada?
    if acao.revisao_exclusao_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Ação {acao_id} já foi desativada na revisão "
                f"{acao.revisao_exclusao_id}."
            ),
        )

    # ── 2. Validar a revisão de desativação ─────────────────────────────────
    await _garantir_revisao_existe_e_pertence(
        payload.revisao_exclusao_id, acao.periodo_id, db
    )

    # ── 3. Marcar como desativada ───────────────────────────────────────────
    acao.revisao_exclusao_id = payload.revisao_exclusao_id

    await db.flush()

    # Recarregar com eager-loading completo (cadeia pai para caminho_completo)
    stmt = (
        select(AcaoPdtic)
        .options(
            selectinload(AcaoPdtic.departamentos_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_demandantes_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(AcaoPdtic.unidades_responsaveis_rel).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai).selectinload(UnidadeOrganizacional.unidade_pai),
        )
        .where(AcaoPdtic.id == acao.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  AÇÕES — EXCLUSÃO DEFINITIVA (hard-delete — erro de cadastro)           ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/acoes/{acao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir ação PDTIC definitivamente (hard-delete)",
    description=(
        "Remove a ação permanentemente do banco de dados. "
        "Use APENAS para corrigir ERROS DE CADASTRO. "
        "Para ações canceladas em revisão oficial, utilize PUT /desativar."
    ),
)
async def excluir_acao_definitivamente(
    acao_id: int,
    db: AsyncSession = Depends(get_db),
):
    acao = await db.get(AcaoPdtic, acao_id)
    if not acao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ação {acao_id} não encontrada.",
        )

    await db.delete(acao)
    await db.flush()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  Helpers internos                                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _garantir_periodo_existe(
    periodo_id: int, db: AsyncSession
) -> PeriodoPdtic:
    """Retorna o período ou levanta 404."""
    periodo = await db.get(PeriodoPdtic, periodo_id)
    if not periodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Período {periodo_id} não encontrado.",
        )
    return periodo


async def _garantir_revisao_existe_e_pertence(
    revisao_id: int,
    periodo_id: int,
    db: AsyncSession,
) -> RevisaoPdtic:
    """Retorna a revisão se existir e pertencer ao período, ou levanta erro."""
    revisao = await db.get(RevisaoPdtic, revisao_id)
    if not revisao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Revisão {revisao_id} não encontrada.",
        )
    if revisao.periodo_id != periodo_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Revisão {revisao_id} pertence ao período {revisao.periodo_id}, "
                f"não ao período {periodo_id}."
            ),
        )
    return revisao
