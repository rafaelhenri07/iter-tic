"""
ITER TIC - Rotas do Módulo 2: Projetos e Licitações

Cobre:
  - CRUD completo de Servidores (equipe de planejamento)
  - CRUD completo de Projetos com gerenciamento de vínculos N:M
    (Ações PDTIC e Itens PACC) e equipe
  - CRUD de Artefatos com auditoria de datas (compliance)
  - Rota /painel consolidada para o front-end
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.pdtic import AcaoPdtic
from app.models.pacc import ItemPacc
from app.models.projeto import (
    Artefato,
    ComentarioArtefato,
    HistoricoDataArtefato,
    Projeto,
    ProjetoTramitacao,
    Servidor,
    StatusArtefatoEnum,
    StatusProjetoEnum,
    TipoArtefatoEnum,
    TipoDataAlteradaEnum,
    projeto_acao_pdtic,
    projeto_item_pacc,
)
from app.schemas.projeto import (
    ArtefatoComHistoricoResponse,
    ArtefatoCreate,
    ArtefatoResponse,
    ArtefatoUpdate,
    ComentarioArtefatoCreate,
    ComentarioArtefatoResponse,
    HistoricoDataArtefatoCreate,
    HistoricoDataArtefatoResponse,
    ProjetoComDetalhesResponse,
    ProjetoCreate,
    ProjetoListagemResponse,
    ArtefatoResumoListagem,
    ComentarioResumoListagem,
    TramitacaoResumoListagem,
    ProjetoPainelResponse,
    ProjetoResponse,
    ProjetoTramitacaoCreate,
    ProjetoTramitacaoResponse,
    ProjetoTramitacaoLicitacaoUpdate,
    ProjetoUpdate,
    ServidorCreate,
    ServidorResponse,
    ServidorUpdate,
)

router = APIRouter(prefix="/projetos", tags=["Projetos e Licitações"])


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SERVIDORES                                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/servidores",
    response_model=list[ServidorResponse],
    summary="Listar servidores",
)
async def listar_servidores(
    q: str | None = Query(None, description="Busca por nome ou matrícula"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Servidor).order_by(Servidor.nome)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Servidor.nome.ilike(like) | Servidor.matricula.ilike(like)
        )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/servidores",
    response_model=ServidorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar servidor",
)
async def criar_servidor(
    payload: ServidorCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verificar duplicidade de matrícula
    stmt = select(Servidor).where(Servidor.matricula == payload.matricula)
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Matrícula '{payload.matricula}' já cadastrada.",
        )

    servidor = Servidor(**payload.model_dump())
    db.add(servidor)
    await db.flush()
    await db.refresh(servidor)
    return servidor


@router.get(
    "/servidores/{servidor_id}",
    response_model=ServidorResponse,
    summary="Obter servidor por ID",
)
async def obter_servidor(
    servidor_id: int,
    db: AsyncSession = Depends(get_db),
):
    servidor = await db.get(Servidor, servidor_id)
    if not servidor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Servidor {servidor_id} não encontrado.",
        )
    return servidor


@router.patch(
    "/servidores/{servidor_id}",
    response_model=ServidorResponse,
    summary="Atualizar servidor",
)
async def atualizar_servidor(
    servidor_id: int,
    payload: ServidorUpdate,
    db: AsyncSession = Depends(get_db),
):
    servidor = await db.get(Servidor, servidor_id)
    if not servidor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Servidor {servidor_id} não encontrado.",
        )

    dados = payload.model_dump(exclude_unset=True)

    # Se está alterando matrícula, checar duplicidade
    if "matricula" in dados and dados["matricula"] != servidor.matricula:
        stmt = select(Servidor).where(Servidor.matricula == dados["matricula"])
        existente = (await db.execute(stmt)).scalar_one_or_none()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Matrícula '{dados['matricula']}' já cadastrada.",
            )

    for campo, valor in dados.items():
        setattr(servidor, campo, valor)

    await db.flush()
    await db.refresh(servidor)
    return servidor


@router.delete(
    "/servidores/{servidor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover servidor",
)
async def remover_servidor(
    servidor_id: int,
    db: AsyncSession = Depends(get_db),
):
    servidor = await db.get(Servidor, servidor_id)
    if not servidor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Servidor {servidor_id} não encontrado.",
        )
    await db.delete(servidor)
    await db.flush()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PROJETOS — LISTAGEM E CONSULTA                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "",
    response_model=list[ProjetoListagemResponse],
    summary="Listar projetos (grid otimizada)",
    description=(
        "Retorna a lista de projetos com contagens e nomes da equipe, "
        "otimizada para renderização em grid/tabela no front-end."
    ),
)
async def listar_projetos(
    status_filtro: StatusProjetoEnum | None = Query(
        None, alias="status", description="Filtrar por status"
    ),
    q: str | None = Query(None, description="Busca por nome ou processo SEI"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Projeto)
        .options(
            selectinload(Projeto.integrante_requisitante),
            selectinload(Projeto.integrante_tecnico),
            selectinload(Projeto.integrante_administrativo),
            selectinload(Projeto.acoes_pdtic),
            selectinload(Projeto.itens_pacc),
            selectinload(Projeto.artefatos).selectinload(Artefato.comentarios),
            selectinload(Projeto.tramitacoes),
        )
        .order_by(Projeto.criado_em.desc())
    )

    if status_filtro:
        stmt = stmt.where(Projeto.status == status_filtro)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Projeto.nome.ilike(like) | Projeto.processo_sei.ilike(like)
        )

    result = await db.execute(stmt)
    projetos = result.scalars().unique().all()

    response = []
    # Ordem canônica da esteira de artefatos
    _ORDEM_ARTEFATOS = [
        TipoArtefatoEnum.DFD,
        TipoArtefatoEnum.ETP,
        TipoArtefatoEnum.MAPA_RISCOS,
        TipoArtefatoEnum.ESTIMATIVA_CUSTOS,
        TipoArtefatoEnum.TR,
    ]
    for p in projetos:
        concluidos = sum(
            1 for a in p.artefatos if a.status == StatusArtefatoEnum.CONCLUIDO
        )
        # Mapear artefatos por tipo para lookup
        artefato_por_tipo = {a.tipo: a for a in p.artefatos}
        hoje = date.today()

        def _dias(a) -> int | None:
            if a.data_inicio and a.data_conclusao:
                return (a.data_conclusao - a.data_inicio).days
            elif a.data_inicio:
                return (hoje - a.data_inicio).days
            return None

        artefatos_resumo = []
        for t in _ORDEM_ARTEFATOS:
            art = artefato_por_tipo.get(t)
            # Comentários: extrair último e total
            _comentarios = art.comentarios if art else []
            _ultimo = _comentarios[0].conteudo if _comentarios else None
            _total = len(_comentarios)
            artefatos_resumo.append(
                ArtefatoResumoListagem(
                    id=art.id if art else None,
                    tipo=t.value,
                    status=art.status.value if art else "Não iniciado",
                    dias_decorridos=_dias(art) if art else None,
                    ultimo_comentario=_ultimo,
                    total_comentarios=_total,
                    data_inicio=art.data_inicio if art else None,
                    data_conclusao=art.data_conclusao if art else None,
                    comentarios=[
                        ComentarioResumoListagem(
                            id=c.id,
                            conteudo=c.conteudo,
                            autor=c.autor,
                            criado_em=c.criado_em,
                        )
                        for c in _comentarios
                    ],
                )
            )
        response.append(
            ProjetoListagemResponse(
                id=p.id,
                nome=p.nome,
                processo_sei=p.processo_sei,
                prioridade=p.prioridade,
                complexidade=p.complexidade,
                status=p.status,
                criado_em=p.criado_em,
                qtd_acoes_pdtic=len(p.acoes_pdtic),
                qtd_itens_pacc=len(p.itens_pacc),
                qtd_artefatos_total=len(p.artefatos),
                qtd_artefatos_concluidos=concluidos,
                artefatos_resumo=artefatos_resumo,
                nome_requisitante=(
                    p.integrante_requisitante.nome
                    if p.integrante_requisitante
                    else None
                ),
                nome_tecnico=(
                    p.integrante_tecnico.nome
                    if p.integrante_tecnico
                    else None
                ),
                nome_administrativo=(
                    p.integrante_administrativo.nome
                    if p.integrante_administrativo
                    else None
                ),
                data_envio_licitacao=p.data_envio_licitacao,
                situacao_licitacao_texto=p.situacao_licitacao_texto,
                tramitacoes_resumo=[
                    TramitacaoResumoListagem(
                        id=t.id,
                        observacao=t.observacao,
                        autor=t.autor,
                        data_hora=t.data_hora,
                    )
                    for t in sorted(
                        p.tramitacoes,
                        key=lambda x: x.data_hora,
                        reverse=True,
                    )
                ],
                total_tramitacoes=len(p.tramitacoes),
            )
        )

    return response


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PROJETOS — CRIAÇÃO                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "",
    response_model=ProjetoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo projeto",
    description=(
        "Cria um projeto e opcionalmente vincula ações PDTIC e itens PACC. "
        "As listas de vínculos podem ser vazias."
    ),
)
async def criar_projeto(
    payload: ProjetoCreate,
    db: AsyncSession = Depends(get_db),
):
    # ── Validar unicidade do processo SEI ────────────────────────────────────
    stmt = select(Projeto).where(Projeto.processo_sei == payload.processo_sei)
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Processo SEI '{payload.processo_sei}' já está "
                f"vinculado ao projeto #{existente.id}."
            ),
        )

    # ── Validar existência dos servidores ────────────────────────────────────
    for campo, label in [
        ("integrante_requisitante_id", "Integrante Requisitante"),
        ("integrante_tecnico_id", "Integrante Técnico"),
        ("integrante_administrativo_id", "Integrante Administrativo"),
    ]:
        sid = getattr(payload, campo)
        if sid is not None:
            servidor = await db.get(Servidor, sid)
            if not servidor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{label} (id={sid}) não encontrado.",
                )

    # ── Validar ações PDTIC ─────────────────────────────────────────────────
    acoes = []
    for acao_id in payload.acoes_pdtic_ids:
        acao = await db.get(AcaoPdtic, acao_id)
        if not acao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ação PDTIC {acao_id} não encontrada.",
            )
        acoes.append(acao)

    # ── Validar itens PACC ──────────────────────────────────────────────────
    itens = []
    for item_id in payload.itens_pacc_ids:
        item = await db.get(ItemPacc, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item PACC {item_id} não encontrado.",
            )
        itens.append(item)

    # ── Criar projeto ───────────────────────────────────────────────────────
    dados = payload.model_dump(exclude={"acoes_pdtic_ids", "itens_pacc_ids"})
    projeto = Projeto(**dados)
    projeto.acoes_pdtic = acoes
    projeto.itens_pacc = itens

    db.add(projeto)
    await db.flush()
    await db.refresh(projeto)
    return projeto


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PROJETOS — DETALHES E PAINEL                                          ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{projeto_id}",
    response_model=ProjetoComDetalhesResponse,
    summary="Obter projeto com detalhes completos",
    description=(
        "Retorna o projeto com equipe populada, artefatos aninhados "
        "e vínculos PDTIC/PACC resumidos."
    ),
)
async def obter_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _carregar_projeto_completo(projeto_id, db)
    return projeto


@router.get(
    "/{projeto_id}/painel",
    response_model=ProjetoPainelResponse,
    summary="Painel consolidado do projeto",
    description=(
        "Retorna tudo que o front-end precisa para a tela de detalhes: "
        "projeto completo + métricas de progresso dos artefatos."
    ),
)
async def obter_painel_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _carregar_projeto_completo(projeto_id, db)

    total = len(projeto.artefatos)
    concluidos = sum(
        1 for a in projeto.artefatos
        if a.status == StatusArtefatoEnum.CONCLUIDO
    )
    pendentes = total - concluidos
    pct = round((concluidos / total * 100) if total > 0 else 0, 1)

    return ProjetoPainelResponse(
        projeto=projeto,
        total_artefatos=total,
        artefatos_concluidos=concluidos,
        artefatos_pendentes=pendentes,
        progresso_percentual=pct,
    )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PROJETOS — ATUALIZAÇÃO                                                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/{projeto_id}",
    response_model=ProjetoResponse,
    summary="Atualizar projeto",
    description=(
        "Atualização parcial. Se `acoes_pdtic_ids` ou `itens_pacc_ids` forem "
        "fornecidos, a lista de vínculos é SUBSTITUÍDA (não acumulativa)."
    ),
)
async def atualizar_projeto(
    projeto_id: int,
    payload: ProjetoUpdate,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _carregar_projeto_completo(projeto_id, db)

    dados = payload.model_dump(exclude_unset=True)

    # ── Validar unicidade de processo SEI se alterado ────────────────────────
    if "processo_sei" in dados and dados["processo_sei"] != projeto.processo_sei:
        stmt = select(Projeto).where(
            Projeto.processo_sei == dados["processo_sei"],
            Projeto.id != projeto_id,
        )
        existente = (await db.execute(stmt)).scalar_one_or_none()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Processo SEI '{dados['processo_sei']}' já em uso.",
            )

    # ── Validar servidores se alterados ──────────────────────────────────────
    for campo in [
        "integrante_requisitante_id",
        "integrante_tecnico_id",
        "integrante_administrativo_id",
    ]:
        if campo in dados and dados[campo] is not None:
            servidor = await db.get(Servidor, dados[campo])
            if not servidor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Servidor id={dados[campo]} não encontrado.",
                )

    # ── Atualizar vínculos PDTIC se fornecidos ──────────────────────────────
    if "acoes_pdtic_ids" in dados:
        ids = dados.pop("acoes_pdtic_ids")
        acoes = []
        for acao_id in ids:
            acao = await db.get(AcaoPdtic, acao_id)
            if not acao:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Ação PDTIC {acao_id} não encontrada.",
                )
            acoes.append(acao)
        projeto.acoes_pdtic = acoes

    # ── Atualizar vínculos PACC se fornecidos ───────────────────────────────
    if "itens_pacc_ids" in dados:
        ids = dados.pop("itens_pacc_ids")
        itens = []
        for item_id in ids:
            item = await db.get(ItemPacc, item_id)
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Item PACC {item_id} não encontrado.",
                )
            itens.append(item)
        projeto.itens_pacc = itens

    # ── Aplicar campos escalares ────────────────────────────────────────────
    for campo, valor in dados.items():
        setattr(projeto, campo, valor)

    await db.flush()
    await db.refresh(projeto)
    return projeto


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  PROJETOS — EXCLUSÃO                                                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.delete(
    "/{projeto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover projeto",
    description="Remove o projeto e todos os artefatos vinculados (cascade).",
)
async def remover_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    projeto = await db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Projeto {projeto_id} não encontrado.",
        )
    await db.delete(projeto)
    await db.flush()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ARTEFATOS — CRUD                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{projeto_id}/artefatos",
    response_model=list[ArtefatoResponse],
    summary="Listar artefatos de um projeto",
)
async def listar_artefatos(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_projeto_existe(projeto_id, db)

    stmt = (
        select(Artefato)
        .where(Artefato.projeto_id == projeto_id)
        .order_by(Artefato.id)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/{projeto_id}/artefatos",
    response_model=ArtefatoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar artefato para o projeto",
    description=(
        "Adiciona um artefato ao projeto. Cada tipo (DFD, ETP, etc.) "
        "só pode existir uma vez por projeto."
    ),
)
async def criar_artefato(
    projeto_id: int,
    payload: ArtefatoCreate,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_projeto_existe(projeto_id, db)

    # Verificar duplicidade de tipo no mesmo projeto
    stmt = select(Artefato).where(
        Artefato.projeto_id == projeto_id,
        Artefato.tipo == payload.tipo,
    )
    existente = (await db.execute(stmt)).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Artefato do tipo '{payload.tipo.value}' já existe "
                f"para o projeto #{projeto_id}."
            ),
        )

    artefato = Artefato(
        projeto_id=projeto_id,
        tipo=payload.tipo,
        observacoes=payload.observacoes,
    )
    db.add(artefato)
    await db.flush()
    await db.refresh(artefato)
    return artefato


@router.get(
    "/artefatos/{artefato_id}",
    response_model=ArtefatoComHistoricoResponse,
    summary="Obter artefato com histórico de datas",
)
async def obter_artefato(
    artefato_id: int,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Artefato)
        .options(selectinload(Artefato.historico_datas))
        .where(Artefato.id == artefato_id)
    )
    artefato = (await db.execute(stmt)).scalar_one_or_none()
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )
    return artefato


@router.patch(
    "/artefatos/{artefato_id}",
    response_model=ArtefatoResponse,
    summary="Atualizar artefato",
    description=(
        "Atualização parcial. Para alterar `data_inicio` ou `data_conclusao`, "
        "use a rota dedicada de auditoria para registrar justificativa."
    ),
)
async def atualizar_artefato(
    artefato_id: int,
    payload: ArtefatoUpdate,
    db: AsyncSession = Depends(get_db),
):
    artefato = await db.get(Artefato, artefato_id)
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )

    dados = payload.model_dump(exclude_unset=True)

    # ── Regras de transição de status ────────────────────────────────────────

    if "status" in dados:
        novo_status = dados["status"]

        # Ao iniciar → preencher data_inicio se não existir
        if novo_status == StatusArtefatoEnum.INICIADO and not artefato.data_inicio:
            artefato.data_inicio = date.today()

        # Ao concluir → preencher data_conclusão se não existir
        if novo_status == StatusArtefatoEnum.CONCLUIDO and not artefato.data_conclusao:
            artefato.data_conclusao = date.today()

    for campo, valor in dados.items():
        setattr(artefato, campo, valor)

    await db.flush()
    await db.refresh(artefato)

    # ── Auto-promoção do projeto para "Pronto para contratação" ──────────────
    await _verificar_promocao_projeto(artefato.projeto_id, db)

    return artefato


@router.delete(
    "/artefatos/{artefato_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover artefato",
)
async def remover_artefato(
    artefato_id: int,
    db: AsyncSession = Depends(get_db),
):
    artefato = await db.get(Artefato, artefato_id)
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )
    await db.delete(artefato)
    await db.flush()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ARTEFATOS — COMENTÁRIOS (histórico de observações)                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/artefatos/{artefato_id}/comentarios",
    response_model=list[ComentarioArtefatoResponse],
    summary="Listar comentários de um artefato",
)
async def listar_comentarios_artefato(
    artefato_id: int,
    db: AsyncSession = Depends(get_db),
):
    artefato = await db.get(Artefato, artefato_id)
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )
    stmt = (
        select(ComentarioArtefato)
        .where(ComentarioArtefato.artefato_id == artefato_id)
        .order_by(ComentarioArtefato.criado_em.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/artefatos/{artefato_id}/comentarios",
    response_model=ComentarioArtefatoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar comentário a um artefato",
)
async def adicionar_comentario_artefato(
    artefato_id: int,
    payload: ComentarioArtefatoCreate,
    db: AsyncSession = Depends(get_db),
):
    artefato = await db.get(Artefato, artefato_id)
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )
    comentario = ComentarioArtefato(
        artefato_id=artefato_id,
        conteudo=payload.conteudo,
        autor=payload.autor or "Usuário do Sistema",
    )
    db.add(comentario)
    await db.flush()
    await db.refresh(comentario)
    return comentario


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ARTEFATOS — AUDITORIA DE DATAS (compliance)                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "/artefatos/{artefato_id}/alterar-data",
    response_model=ArtefatoResponse,
    summary="Alterar data de artefato com justificativa (auditoria)",
    description=(
        "Altera `data_inicio` ou `data_conclusao` de um artefato, "
        "registrando obrigatoriamente a justificativa no histórico de "
        "auditoria. Cada alteração cria um registro em "
        "`historico_datas_artefato` para compliance."
    ),
)
async def alterar_data_artefato(
    artefato_id: int,
    payload: HistoricoDataArtefatoCreate,
    db: AsyncSession = Depends(get_db),
):
    artefato = await db.get(Artefato, artefato_id)
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )

    # ── Validar que a data antiga confere ────────────────────────────────────
    if payload.tipo_data_alterada == TipoDataAlteradaEnum.DATA_INICIO:
        data_atual = artefato.data_inicio
    else:
        data_atual = artefato.data_conclusao

    if data_atual != payload.data_antiga:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"A data antiga informada ({payload.data_antiga}) não confere "
                f"com a data atual do artefato ({data_atual})."
            ),
        )

    # ── Registrar no histórico de auditoria ──────────────────────────────────
    historico = HistoricoDataArtefato(
        artefato_id=artefato_id,
        tipo_data_alterada=payload.tipo_data_alterada,
        data_antiga=payload.data_antiga,
        data_nova=payload.data_nova,
        justificativa=payload.justificativa,
    )
    db.add(historico)

    # ── Atualizar a data no artefato ─────────────────────────────────────────
    if payload.tipo_data_alterada == TipoDataAlteradaEnum.DATA_INICIO:
        artefato.data_inicio = payload.data_nova
    else:
        artefato.data_conclusao = payload.data_nova

    await db.flush()
    await db.refresh(artefato)
    return artefato


@router.get(
    "/artefatos/{artefato_id}/historico",
    response_model=list[HistoricoDataArtefatoResponse],
    summary="Consultar histórico de alterações de datas de um artefato",
)
async def listar_historico_datas(
    artefato_id: int,
    db: AsyncSession = Depends(get_db),
):
    artefato = await db.get(Artefato, artefato_id)
    if not artefato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artefato {artefato_id} não encontrado.",
        )

    stmt = (
        select(HistoricoDataArtefato)
        .where(HistoricoDataArtefato.artefato_id == artefato_id)
        .order_by(HistoricoDataArtefato.data_registro.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ARTEFATOS — INICIALIZAÇÃO EM LOTE                                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "/{projeto_id}/artefatos/inicializar",
    response_model=list[ArtefatoResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Inicializar todos os artefatos obrigatórios",
    description=(
        "Cria de uma vez todos os 5 artefatos obrigatórios (DFD, ETP, "
        "Mapa de Riscos, Estimativa de Custos, TR) para o projeto, "
        "todos com status 'Não iniciado'. Ignora tipos já existentes."
    ),
)
async def inicializar_artefatos(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_projeto_existe(projeto_id, db)

    # Buscar tipos já existentes
    stmt = select(Artefato.tipo).where(Artefato.projeto_id == projeto_id)
    result = await db.execute(stmt)
    tipos_existentes = {row[0] for row in result.fetchall()}

    criados = []
    for tipo in TipoArtefatoEnum:
        if tipo not in tipos_existentes:
            artefato = Artefato(projeto_id=projeto_id, tipo=tipo)
            db.add(artefato)
            criados.append(artefato)

    await db.flush()
    for a in criados:
        await db.refresh(a)

    return criados


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  FASE EXTERNA — LICITAÇÃO                                                 ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "/{projeto_id}/enviar-licitacao",
    response_model=ProjetoResponse,
    summary="Enviar projeto para licitação",
    description=(
        "Muda o status do projeto para 'Em licitação' e registra a data "
        "de envio (hoje). Só pode ser acionado quando o projeto está "
        "'Pronto para contratação'."
    ),
)
async def enviar_para_licitacao(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _carregar_projeto_completo(projeto_id, db)

    if projeto.status != StatusProjetoEnum.FASE_INTERNA:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Apenas projetos com status 'Pronto para contratação' "
                f"podem ser enviados para licitação. "
                f"Status atual: '{projeto.status.value}'."
            ),
        )

    # ── Regra de negócio: todos os artefatos devem estar concluídos ───────
    if not projeto.artefatos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "O projeto não possui artefatos. "
                "Crie e conclua todos os artefatos obrigatórios antes de "
                "enviar para licitação."
            ),
        )

    pendentes = [
        a.tipo.value
        for a in projeto.artefatos
        if a.status != StatusArtefatoEnum.CONCLUIDO
    ]
    if pendentes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Todos os artefatos devem estar concluídos para enviar "
                f"o projeto para licitação. "
                f"Artefatos pendentes: {', '.join(pendentes)}."
            ),
        )

    projeto.status = StatusProjetoEnum.FASE_EXTERNA
    projeto.data_envio_licitacao = date.today()

    await db.flush()
    await db.refresh(projeto)
    return projeto


@router.patch(
    "/{projeto_id}/tramite-licitacao",
    response_model=ProjetoResponse,
    summary="Atualizar situação da licitação",
    description=(
        "Permite atualizar livremente o campo de texto 'situação da "
        "licitação' (ex: 'Processo na Procuradoria Jurídica'). "
        "O projeto deve estar com status 'Em licitação'."
    ),
)
async def tramitar_licitacao(
    projeto_id: int,
    payload: ProjetoTramitacaoLicitacaoUpdate,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _garantir_projeto_existe(projeto_id, db)

    if projeto.status != StatusProjetoEnum.FASE_EXTERNA:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Tramitação só disponível para projetos 'Em licitação'. "
                f"Status atual: '{projeto.status.value}'."
            ),
        )

    projeto.situacao_licitacao_texto = payload.situacao_licitacao_texto

    await db.flush()
    await db.refresh(projeto)
    return projeto


@router.post(
    "/{projeto_id}/concluir-licitacao",
    response_model=ProjetoResponse,
    summary="Concluir licitação do projeto",
    description=(
        "Muda o status do projeto para 'Licitação concluída'. "
        "Só pode ser acionado quando o projeto está 'Em licitação'."
    ),
)
async def concluir_licitacao(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _garantir_projeto_existe(projeto_id, db)

    if projeto.status != StatusProjetoEnum.FASE_EXTERNA:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Apenas projetos 'Em licitação' podem ter a licitação "
                f"concluída. Status atual: '{projeto.status.value}'."
            ),
        )

    projeto.status = StatusProjetoEnum.CONTRATADO

    await db.flush()
    await db.refresh(projeto)
    return projeto


@router.post(
    "/{projeto_id}/tramitacoes",
    response_model=ProjetoTramitacaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar tramitação (Log) na fase externa",
)
async def adicionar_tramitacao_projeto(
    projeto_id: int,
    payload: ProjetoTramitacaoCreate,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_projeto_existe(projeto_id, db)

    tramitacao = ProjetoTramitacao(
        projeto_id=projeto_id,
        observacao=payload.observacao,
        autor=payload.autor or "Usuário do Sistema",
    )
    db.add(tramitacao)
    await db.flush()
    await db.refresh(tramitacao)
    return tramitacao


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HELPERS INTERNOS                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _garantir_projeto_existe(
    projeto_id: int, db: AsyncSession
) -> Projeto:
    """Retorna o projeto ou levanta 404."""
    projeto = await db.get(Projeto, projeto_id)
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Projeto {projeto_id} não encontrado.",
        )
    return projeto


async def _carregar_projeto_completo(
    projeto_id: int, db: AsyncSession
) -> Projeto:
    """Carrega o projeto com todos os relacionamentos eager-loaded."""
    stmt = (
        select(Projeto)
        .options(
            selectinload(Projeto.integrante_requisitante),
            selectinload(Projeto.integrante_tecnico),
            selectinload(Projeto.integrante_administrativo),
            selectinload(Projeto.acoes_pdtic),
            selectinload(Projeto.itens_pacc),
            selectinload(Projeto.artefatos),
            selectinload(Projeto.tramitacoes),
        )
        .where(Projeto.id == projeto_id)
    )
    projeto = (await db.execute(stmt)).scalar_one_or_none()
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Projeto {projeto_id} não encontrado.",
        )
    return projeto


async def _verificar_promocao_projeto(
    projeto_id: int, db: AsyncSession
) -> None:
    """
    (Desativado) Auto-promoção de status baseada em artefatos não é mais 
    necessária, pois 'Em elaboração' e 'Pronto para contratação' foram 
    unificados em 'Fase interna'.
    """
    pass
