"""
ITER TIC - Rotas do Módulo 2: Projetos e Licitações

Cobre:
  - CRUD completo de Servidores (equipe de planejamento)
  - CRUD completo de Projetos com gerenciamento de vínculos N:M
    (Ações PDTIC e Itens PACC) e equipe
  - CRUD de Artefatos com auditoria de datas (compliance)
  - Rota /painel consolidada para o front-end
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.pdtic import AcaoPdtic
from app.models.pacc import ItemPacc
from app.models.projeto import (
    Artefato,
    ComentarioArtefato,
    HistoricoDataArtefato,
    ObservacaoFaseExterna,
    Projeto,
    ProjetoTramitacao,
    ProjetoEquipe,
    PapelProjetoEnum,
    Servidor,
    StatusArtefatoEnum,
    StatusProjetoEnum,
    TipoArtefatoEnum,
    TipoDataAlteradaEnum,
    projeto_acao_pdtic,
    projeto_item_pacc,
    ProjetoHistorico,
    TipoRegistroHistoricoProjetoEnum,
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
    HistoricoEventoResponse,
    ObservacaoFaseExternaCreate,
    ObservacaoFaseExternaResponse,
    ProjetoComDetalhesResponse,
    ProjetoCreate,
    ProjetoListagemResponse,
    ArtefatoResumoListagem,
    ComentarioResumoListagem,
    TramitacaoResumoListagem,
    UltimaMovimentacaoResumo,
    ProjetoPainelResponse,
    ProjetoResponse,
    ProjetoTramitacaoCreate,
    ProjetoTramitacaoResponse,
    ProjetoTramitacaoLicitacaoUpdate,
    ProjetoUpdate,
    ServidorCreate,
    ServidorResponse,
    ServidorUpdate,
    ObservacaoProjetoCreate,
    HistoricoProjetoResponse,
)

router = APIRouter(prefix="/projetos", tags=["Projetos e Licitações"])


# ── Matriz de SLA por Complexidade (dias corridos) ────────────────────────────
SLA_MATRIX: dict[str, dict[TipoArtefatoEnum, int]] = {
    "Simples": {
        TipoArtefatoEnum.DFD: 15,
        TipoArtefatoEnum.ETP: 90,
        TipoArtefatoEnum.MAPA_RISCOS: 15,
        TipoArtefatoEnum.ESTIMATIVA_CUSTOS: 30,
        TipoArtefatoEnum.TR: 60,
    },
    "Intermediária": {
        TipoArtefatoEnum.DFD: 15,
        TipoArtefatoEnum.ETP: 120,
        TipoArtefatoEnum.MAPA_RISCOS: 15,
        TipoArtefatoEnum.ESTIMATIVA_CUSTOS: 30,
        TipoArtefatoEnum.TR: 60,
    },
    "Complexa": {
        TipoArtefatoEnum.DFD: 15,
        TipoArtefatoEnum.ETP: 180,
        TipoArtefatoEnum.MAPA_RISCOS: 20,
        TipoArtefatoEnum.ESTIMATIVA_CUSTOS: 60,
        TipoArtefatoEnum.TR: 90,
    },
}


def _calcular_data_fim_prevista(
    complexidade: str, tipo: TipoArtefatoEnum, data_inicio: date
) -> date | None:
    """Calcula a data fim prevista baseando-se na matriz de SLA."""
    prazos = SLA_MATRIX.get(complexidade)
    if not prazos:
        return None
    dias = prazos.get(tipo)
    if dias is None:
        return None
    return data_inicio + timedelta(days=dias)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SERVIDORES                                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝

def _servidor_lotacao_options():
    """Constrói cadeia de selectinload para carregar lotação + pais (caminho_completo)."""
    from app.models.estrutura_organizacional import UnidadeOrganizacional
    opt = selectinload(Servidor.lotacao).selectinload(UnidadeOrganizacional.unidade_pai)
    for _ in range(4):
        opt = opt.selectinload(UnidadeOrganizacional.unidade_pai)
    return opt



@router.get(
    "/servidores",
    response_model=list[ServidorResponse],
    summary="Listar servidores",
)
async def listar_servidores(
    q: str | None = Query(None, description="Busca por nome ou matrícula"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Servidor)
        .options(_servidor_lotacao_options())
        .order_by(Servidor.nome)
    )
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

    from app.models.estrutura_organizacional import UnidadeOrganizacional

    # Verificar se a lotação existe
    lotacao = await db.get(UnidadeOrganizacional, payload.lotacao_id)
    if not lotacao:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Lotação com id={payload.lotacao_id} não encontrada.",
        )

    servidor = Servidor(**payload.model_dump())
    db.add(servidor)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Erro de integridade ao salvar servidor. Verifique os dados.",
        )

    # Re-consultar com eager loading recursivo para caminho_completo
    stmt = (
        select(Servidor)
        .options(_servidor_lotacao_options())
        .where(Servidor.id == servidor.id)
    )
    servidor = (await db.execute(stmt)).scalar_one()
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
    stmt = (
        select(Servidor)
        .options(_servidor_lotacao_options())
        .where(Servidor.id == servidor_id)
    )
    servidor = (await db.execute(stmt)).scalar_one_or_none()
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
    # Para garantir o carregamento das FKs no retorno, re-consultamos
    stmt = (
        select(Servidor)
        .options(_servidor_lotacao_options())
        .where(Servidor.id == servidor.id)
    )
    servidor = (await db.execute(stmt)).scalar_one()
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
    is_legado: bool | None = Query(
        None, description="Filtrar por tipo: true=legados, false=nova esteira"
    ),
    q: str | None = Query(None, description="Busca por nome ou processo SEI"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Projeto)
        .options(
            selectinload(Projeto.equipe_membros).selectinload(ProjetoEquipe.servidor),
            selectinload(Projeto.acoes_pdtic),
            selectinload(Projeto.itens_pacc),
            selectinload(Projeto.artefatos).selectinload(Artefato.comentarios),
            selectinload(Projeto.tramitacoes),
            selectinload(Projeto.observacoes_fase_externa).selectinload(ObservacaoFaseExterna.usuario),
        )
        .order_by(Projeto.criado_em.desc())
    )

    if status_filtro:
        stmt = stmt.where(Projeto.status == status_filtro)
    if is_legado is not None:
        stmt = stmt.where(Projeto.is_legado == is_legado)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Projeto.nome.ilike(like) | Projeto.processo_sei.ilike(like)
        )

    result = await db.execute(stmt)
    projetos = result.scalars().unique().all()

    # ── Helpers para tooltip enriquecido ──────────────────────────────────
    def _ultima_mov(p: Projeto):
        obs_list = p.observacoes_fase_externa or []
        if not obs_list:
            return None
        # relationship já ordenado por criado_em desc → primeiro é o mais recente
        ultima = obs_list[0]
        autor_nome = ultima.usuario.nome if ultima.usuario else "Usuário do Sistema"
        return UltimaMovimentacaoResumo(
            texto=ultima.texto,
            autor=autor_nome,
            data=ultima.criado_em,
        )

    def _duracao_fase(p: Projeto):
        if not p.data_envio_licitacao:
            return None
        return (date.today() - p.data_envio_licitacao).days

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
                    data_fim_prevista=art.data_fim_prevista if art else None,
                    data_conclusao=art.data_conclusao if art else None,
                    justificativa_atraso=art.justificativa_atraso if art else None,
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
        reqs = [m.servidor.nome for m in p.equipe_membros if m.papel == PapelProjetoEnum.REQUISITANTE]
        tecs = [m.servidor.nome for m in p.equipe_membros if m.papel == PapelProjetoEnum.TECNICO]
        adms = [m.servidor.nome for m in p.equipe_membros if m.papel == PapelProjetoEnum.ADMINISTRATIVO]

        nome_req = f"{reqs[0]} (+{len(reqs)-1})" if len(reqs) > 1 else (reqs[0] if reqs else None)
        nome_tec = f"{tecs[0]} (+{len(tecs)-1})" if len(tecs) > 1 else (tecs[0] if tecs else None)
        nome_adm = f"{adms[0]} (+{len(adms)-1})" if len(adms) > 1 else (adms[0] if adms else None)

        response.append(
            ProjetoListagemResponse(
                id=p.id,
                nome=p.nome,
                processo_sei=p.processo_sei,
                prioridade=p.prioridade,
                complexidade=p.complexidade,
                status=p.status,
                is_legado=p.is_legado,
                criado_em=p.criado_em,
                qtd_acoes_pdtic=len(p.acoes_pdtic),
                qtd_itens_pacc=len(p.itens_pacc),
                qtd_artefatos_total=len(p.artefatos),
                qtd_artefatos_concluidos=concluidos,
                artefatos_resumo=artefatos_resumo,
                nome_requisitante=nome_req,
                nome_tecnico=nome_tec,
                nome_administrativo=nome_adm,
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
                ultima_movimentacao=_ultima_mov(p),
                duracao_fase_externa_dias=_duracao_fase(p),
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

    # ── Validar existência dos servidores (pula para projetos legados) ──────
    equipe = []
    if not payload.is_legado:
        for sids, papel in [
            (payload.integrantes_requisitantes_ids, PapelProjetoEnum.REQUISITANTE),
            (payload.integrantes_tecnicos_ids, PapelProjetoEnum.TECNICO),
            (payload.integrantes_administrativos_ids, PapelProjetoEnum.ADMINISTRATIVO),
        ]:
            for sid in sids:
                servidor = await db.get(Servidor, sid)
                if not servidor:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Servidor (id={sid}) não encontrado.",
                    )
                equipe.append(ProjetoEquipe(servidor_id=sid, papel=papel, is_titular=True))

        # Substitutos
        for sids, papel in [
            (payload.substitutos_requisitantes_ids, PapelProjetoEnum.REQUISITANTE),
            (payload.substitutos_tecnicos_ids, PapelProjetoEnum.TECNICO),
            (payload.substitutos_administrativos_ids, PapelProjetoEnum.ADMINISTRATIVO),
        ]:
            for sid in sids:
                servidor = await db.get(Servidor, sid)
                if not servidor:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Servidor (id={sid}) não encontrado.",
                    )
                equipe.append(ProjetoEquipe(servidor_id=sid, papel=papel, is_titular=False))

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
    dados = payload.model_dump(
        exclude={
            "acoes_pdtic_ids", 
            "itens_pacc_ids", 
            "integrantes_requisitantes_ids", 
            "integrantes_tecnicos_ids", 
            "integrantes_administrativos_ids",
            "substitutos_requisitantes_ids",
            "substitutos_tecnicos_ids",
            "substitutos_administrativos_ids",
        }
    )
    projeto = Projeto(**dados)
    projeto.acoes_pdtic = acoes
    projeto.itens_pacc = itens
    if equipe:
        projeto.equipe_membros = equipe

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
    _preencher_equipe_response(projeto)
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
    _preencher_equipe_response(projeto)

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
    from sqlalchemy import delete
    
    reqs_ids = dados.get("integrantes_requisitantes_ids")
    tecs_ids = dados.get("integrantes_tecnicos_ids")
    adms_ids = dados.get("integrantes_administrativos_ids")
    sub_reqs_ids = dados.get("substitutos_requisitantes_ids")
    sub_tecs_ids = dados.get("substitutos_tecnicos_ids")
    sub_adms_ids = dados.get("substitutos_administrativos_ids")

    equipe_changed = any(v is not None for v in [reqs_ids, tecs_ids, adms_ids, sub_reqs_ids, sub_tecs_ids, sub_adms_ids])

    if equipe_changed:
        # Pega a equipe atual para o que não foi enviado no payload
        if reqs_ids is None:
            reqs_ids = [m.servidor_id for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.REQUISITANTE and m.is_titular]
        if tecs_ids is None:
            tecs_ids = [m.servidor_id for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.TECNICO and m.is_titular]
        if adms_ids is None:
            adms_ids = [m.servidor_id for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.ADMINISTRATIVO and m.is_titular]
        if sub_reqs_ids is None:
            sub_reqs_ids = [m.servidor_id for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.REQUISITANTE and not m.is_titular]
        if sub_tecs_ids is None:
            sub_tecs_ids = [m.servidor_id for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.TECNICO and not m.is_titular]
        if sub_adms_ids is None:
            sub_adms_ids = [m.servidor_id for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.ADMINISTRATIVO and not m.is_titular]
        
        # Validar servidores
        for sid in set(reqs_ids + tecs_ids + adms_ids + sub_reqs_ids + sub_tecs_ids + sub_adms_ids):
            if not await db.get(Servidor, sid):
                raise HTTPException(status_code=404, detail=f"Servidor id={sid} não encontrado.")
        
        # Atualizar equipe (limpar e recriar)
        await db.execute(delete(ProjetoEquipe).where(ProjetoEquipe.projeto_id == projeto_id))
        
        equipe_nova = []
        for sid in reqs_ids:
            equipe_nova.append(ProjetoEquipe(servidor_id=sid, papel=PapelProjetoEnum.REQUISITANTE, is_titular=True))
        for sid in tecs_ids:
            equipe_nova.append(ProjetoEquipe(servidor_id=sid, papel=PapelProjetoEnum.TECNICO, is_titular=True))
        for sid in adms_ids:
            equipe_nova.append(ProjetoEquipe(servidor_id=sid, papel=PapelProjetoEnum.ADMINISTRATIVO, is_titular=True))
        for sid in sub_reqs_ids:
            equipe_nova.append(ProjetoEquipe(servidor_id=sid, papel=PapelProjetoEnum.REQUISITANTE, is_titular=False))
        for sid in sub_tecs_ids:
            equipe_nova.append(ProjetoEquipe(servidor_id=sid, papel=PapelProjetoEnum.TECNICO, is_titular=False))
        for sid in sub_adms_ids:
            equipe_nova.append(ProjetoEquipe(servidor_id=sid, papel=PapelProjetoEnum.ADMINISTRATIVO, is_titular=False))
            
        projeto.equipe_membros = equipe_nova
        
    dados.pop("integrantes_requisitantes_ids", None)
    dados.pop("integrantes_tecnicos_ids", None)
    dados.pop("integrantes_administrativos_ids", None)
    dados.pop("substitutos_requisitantes_ids", None)
    dados.pop("substitutos_tecnicos_ids", None)
    dados.pop("substitutos_administrativos_ids", None)

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
    
    projeto = await _carregar_projeto_completo(projeto_id, db)
    _preencher_equipe_response(projeto)
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
        "Atualização parcial. Ao iniciar, envie `data_inicio`. "
        "Para alterar `data_inicio` de um artefato já iniciado, envie `justificativa_alteracao`."
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
    justificativa = dados.pop("justificativa_alteracao", None)
    justificativa_atraso = dados.pop("justificativa_atraso", None)

    # Carregar projeto pai para consultar complexidade (SLA)
    projeto = await db.get(Projeto, artefato.projeto_id)

    # ── Calcular SLA ao definir data_inicio pela primeira vez ─────────────────
    is_primeiro_inicio = artefato.data_inicio is None and "data_inicio" in dados and dados["data_inicio"] is not None
    if is_primeiro_inicio and projeto:
        data_fim = _calcular_data_fim_prevista(
            projeto.complexidade, artefato.tipo, dados["data_inicio"]
        )
        if data_fim:
            artefato.data_fim_prevista = data_fim

    # ── Detectar alteração de data_inicio em artefato já iniciado ─────────────
    if (
        artefato.data_inicio is not None
        and "data_inicio" in dados
        and dados["data_inicio"] != artefato.data_inicio
    ):
        # Exigir justificativa
        if not justificativa or len(justificativa.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Justificativa obrigatória (mín. 10 caracteres) ao "
                    "alterar a Data de Início de um artefato já iniciado."
                ),
            )

        # Registrar no histórico de auditoria
        historico = HistoricoDataArtefato(
            artefato_id=artefato_id,
            tipo_data_alterada=TipoDataAlteradaEnum.DATA_INICIO,
            data_antiga=artefato.data_inicio,
            data_nova=dados["data_inicio"],
            justificativa=justificativa.strip(),
        )
        db.add(historico)

        # Criar comentário automático
        data_ant = artefato.data_inicio.strftime("%d/%m/%Y")
        data_nov = dados["data_inicio"].strftime("%d/%m/%Y")
        comentario = ComentarioArtefato(
            artefato_id=artefato_id,
            conteudo=(
                f"⏰ Data de Início alterada: {data_ant} → {data_nov}. "
                f"Justificativa: {justificativa.strip()}"
            ),
            autor="Sistema (Edição de Data)",
        )
        db.add(comentario)

        # Recalcular SLA com a nova data de início
        if projeto:
            data_fim = _calcular_data_fim_prevista(
                projeto.complexidade, artefato.tipo, dados["data_inicio"]
            )
            if data_fim:
                artefato.data_fim_prevista = data_fim

    # ── Regras de transição de status ────────────────────────────────────────
    if "status" in dados:
        novo_status = dados["status"]

        # Ao concluir → preencher data_conclusão se não existir
        if novo_status == StatusArtefatoEnum.CONCLUIDO:
            data_conclusao_efetiva = dados.get("data_conclusao") or artefato.data_conclusao or date.today()
            if "data_conclusao" not in dados:
                artefato.data_conclusao = data_conclusao_efetiva

            # ── Validar justificativa de atraso se ultrapassou o prazo ────────
            if artefato.data_fim_prevista and data_conclusao_efetiva > artefato.data_fim_prevista:
                if not justificativa_atraso or len(justificativa_atraso.strip()) < 10:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"O artefato ultrapassou o prazo previsto "
                            f"({artefato.data_fim_prevista.strftime('%d/%m/%Y')}). "
                            f"A justificativa de atraso é obrigatória (mín. 10 caracteres)."
                        ),
                    )
                artefato.justificativa_atraso = justificativa_atraso.strip()

    for campo, valor in dados.items():
        setattr(artefato, campo, valor)

    await db.flush()
    await db.refresh(artefato)

    # ── Auto-promoção do projeto ───────────────────────────────────────────
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
# ║  HISTÓRICO E FASE EXTERNA (DIÁRIO DE BORDO)                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝

@router.get(
    "/{projeto_id}/historico",
    response_model=list[HistoricoEventoResponse],
    summary="Obter histórico unificado do projeto em formato de timeline",
    description=(
        "Retorna uma linha do tempo consolidada com: registro do projeto, "
        "início/conclusão de artefatos e anotações do diário de bordo da "
        "Fase Externa, ordenados cronologicamente."
    ),
)
async def obter_historico_projeto(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    projeto = await _garantir_projeto_existe(projeto_id, db)

    # ── Eager-load artefatos ─────────────────────────────────────────────
    stmt = (
        select(Projeto)
        .options(selectinload(Projeto.artefatos))
        .where(Projeto.id == projeto_id)
    )
    projeto = (await db.execute(stmt)).scalar_one()

    eventos: list[dict] = []

    # ── 1. Evento de Criação do Projeto ──────────────────────────────────
    eventos.append({
        "id": f"criacao-{projeto.id}",
        "data_evento": projeto.criado_em,
        "titulo": "Projeto Registrado no Sistema",
        "descricao": (
            "O projeto de contratação foi cadastrado no ITER-TIC e encontra-se "
            "disponível para acompanhamento pela equipe de planejamento."
        ),
        "tipo": "criacao",
        "icone": "folder",
    })

    # ── 2. Eventos dos Artefatos ─────────────────────────────────────────
    for art in projeto.artefatos:
        # Início
        if art.data_inicio:
            eventos.append({
                "id": f"inicio-{art.id}",
                "data_evento": art.criado_em,
                "titulo": f"Elaboração do {art.tipo.value} Iniciada",
                "descricao": (
                    f"O status do artefato foi atualizado no sistema indicando "
                    f"o início dos trabalhos. Data-base retroativa: "
                    f"{art.data_inicio.strftime('%d/%m/%Y')}."
                ),
                "tipo": "inicio",
                "icone": "play",
            })

        # Conclusão
        if art.data_conclusao:
            descricao = (
                f"A elaboração foi finalizada e registrada no sistema. "
                f"Data de conclusão: {art.data_conclusao.strftime('%d/%m/%Y')}."
            )
            tipo = "conclusao"
            icone = "check"

            # Verificar atraso
            if art.data_fim_prevista and art.data_conclusao > art.data_fim_prevista:
                descricao += (
                    f"\n⚠ Atenção: A conclusão ultrapassou o prazo previsto "
                    f"({art.data_fim_prevista.strftime('%d/%m/%Y')})."
                )
                if art.justificativa_atraso:
                    descricao += (
                        f"\nJustificativa registrada: {art.justificativa_atraso}"
                    )
                tipo = "atraso"
                icone = "alert"

            eventos.append({
                "id": f"conclusao-{art.id}",
                "data_evento": art.atualizado_em,
                "titulo": f"{art.tipo.value} Concluído",
                "descricao": descricao,
                "tipo": tipo,
                "icone": icone,
            })

    # ── 3. Anotações do Diário de Bordo (Fase Externa) ───────────────────
    stmt_obs = (
        select(ObservacaoFaseExterna)
        .options(selectinload(ObservacaoFaseExterna.usuario))
        .where(ObservacaoFaseExterna.projeto_id == projeto_id)
    )
    result_obs = await db.execute(stmt_obs)
    observacoes = result_obs.scalars().all()

    for obs in observacoes:
        autor_nome = obs.usuario.nome if obs.usuario else "Usuário do Sistema"
        eventos.append({
            "id": f"obs-fase-ext-{obs.id}",
            "data_evento": obs.criado_em,
            "titulo": "Fase Externa",
            "descricao": f"Registrado por: {autor_nome}\n\n{obs.texto}",
            "tipo": "observacao",
            "icone": "message",
        })

    # ── 4. Observações Manuais (ProjetoHistorico) ─────────────────────────
    stmt_hist = (
        select(ProjetoHistorico)
        .where(
            ProjetoHistorico.projeto_id == projeto_id,
            ProjetoHistorico.tipo_registro == TipoRegistroHistoricoProjetoEnum.OBSERVACAO_MANUAL,
        )
    )
    result_hist = await db.execute(stmt_hist)
    obs_manuais = result_hist.scalars().all()

    for obs in obs_manuais:
        eventos.append({
            "id": f"obs-manual-{obs.id}",
            "data_evento": obs.data_hora,
            "titulo": "Observação Manual",
            "descricao": f"Registrado por: {obs.autor}\n\n{obs.conteudo}",
            "tipo": "observacao",
            "icone": "message",
        })

    # ── Ordenar cronologicamente (decrescente) ───────────────────────────
    eventos.sort(key=lambda x: x["data_evento"], reverse=True)

    return eventos


@router.get(
    "/{projeto_id}/fase-externa/observacoes",
    response_model=list[ObservacaoFaseExternaResponse],
    summary="Listar diário de bordo (observações) da Fase Externa",
)
async def listar_observacoes_fase_externa(
    projeto_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_projeto_existe(projeto_id, db)
    stmt = (
        select(ObservacaoFaseExterna)
        .options(selectinload(ObservacaoFaseExterna.usuario))
        .where(ObservacaoFaseExterna.projeto_id == projeto_id)
        .order_by(ObservacaoFaseExterna.criado_em.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/{projeto_id}/fase-externa/observacoes",
    response_model=ObservacaoFaseExternaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar anotação no diário de bordo da Fase Externa",
)
async def adicionar_observacao_fase_externa(
    projeto_id: int,
    payload: ObservacaoFaseExternaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    await _garantir_projeto_existe(projeto_id, db)
    
    nova_obs = ObservacaoFaseExterna(
        projeto_id=projeto_id,
        texto=payload.texto,
        usuario_id=current_user.id
    )
    db.add(nova_obs)
    await db.flush()
    await db.refresh(nova_obs)

    # Carregar o usuário para o response
    stmt = select(ObservacaoFaseExterna).options(selectinload(ObservacaoFaseExterna.usuario)).where(ObservacaoFaseExterna.id == nova_obs.id)
    nova_obs = (await db.execute(stmt)).scalar_one()

    return nova_obs


@router.post(
    "/{projeto_id}/observacoes",
    response_model=HistoricoProjetoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar observação manual ao projeto",
)
async def adicionar_observacao_projeto(
    projeto_id: int,
    payload: ObservacaoProjetoCreate,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_projeto_existe(projeto_id, db)

    historico = ProjetoHistorico(
        projeto_id=projeto_id,
        autor=payload.autor,
        tipo_registro=TipoRegistroHistoricoProjetoEnum.OBSERVACAO_MANUAL,
        conteudo=payload.conteudo,
    )
    db.add(historico)
    await db.flush()
    await db.refresh(historico)

    return HistoricoProjetoResponse.model_validate(historico)


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
    from app.models.estrutura_organizacional import UnidadeOrganizacional

    # Cadeia recursiva para a hierarquia de unidades (até 5 níveis)
    _lotacao_chain = (
        selectinload(Servidor.lotacao)
        .selectinload(UnidadeOrganizacional.unidade_pai)
        .selectinload(UnidadeOrganizacional.unidade_pai)
        .selectinload(UnidadeOrganizacional.unidade_pai)
        .selectinload(UnidadeOrganizacional.unidade_pai)
        .selectinload(UnidadeOrganizacional.unidade_pai)
    )

    stmt = (
        select(Projeto)
        .options(
            selectinload(Projeto.equipe_membros)
            .selectinload(ProjetoEquipe.servidor)
            .selectinload(Servidor.lotacao)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai)
            .selectinload(UnidadeOrganizacional.unidade_pai),
            selectinload(Projeto.acoes_pdtic),
            selectinload(Projeto.itens_pacc),
            selectinload(Projeto.artefatos),
            selectinload(Projeto.tramitacoes),
            selectinload(Projeto.historico),
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

def _preencher_equipe_response(projeto: Projeto):
    """Mapeia equipe_membros nativo do ORM para propriedades efêmeras de resposta"""
    # Titulares
    projeto.integrantes_requisitantes = [m.servidor for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.REQUISITANTE and m.is_titular]
    projeto.integrantes_tecnicos = [m.servidor for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.TECNICO and m.is_titular]
    projeto.integrantes_administrativos = [m.servidor for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.ADMINISTRATIVO and m.is_titular]
    
    projeto.integrantes_requisitantes_ids = [s.id for s in projeto.integrantes_requisitantes]
    projeto.integrantes_tecnicos_ids = [s.id for s in projeto.integrantes_tecnicos]
    projeto.integrantes_administrativos_ids = [s.id for s in projeto.integrantes_administrativos]

    # Substitutos
    projeto.substitutos_requisitantes = [m.servidor for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.REQUISITANTE and not m.is_titular]
    projeto.substitutos_tecnicos = [m.servidor for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.TECNICO and not m.is_titular]
    projeto.substitutos_administrativos = [m.servidor for m in projeto.equipe_membros if m.papel == PapelProjetoEnum.ADMINISTRATIVO and not m.is_titular]
    
    projeto.substitutos_requisitantes_ids = [s.id for s in projeto.substitutos_requisitantes]
    projeto.substitutos_tecnicos_ids = [s.id for s in projeto.substitutos_tecnicos]
    projeto.substitutos_administrativos_ids = [s.id for s in projeto.substitutos_administrativos]

