"""
ITER TIC - Middleware e Utilitários de Auditoria

Intercepta requisições mutáveis (POST, PUT, PATCH, DELETE) e grava
automaticamente um registro na tabela `auditoria_logs`. Opera em modo
silencioso (fire-and-forget): nunca bloqueia nem falha a requisição.

Também fornece a função `registrar_auditoria` para uso direto em routers
quando se deseja um controle mais granular dos detalhes.
"""

import json
import logging
from typing import Optional

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

import jwt
from jwt.exceptions import PyJWTError

from app.database import async_session_factory
from app.models.auditoria import AuditoriaLog
from app.models.usuario import Usuario
from app.core.security import SECRET_KEY, ALGORITHM

logger = logging.getLogger("auditoria")

# ── Mapeamento de rotas para entidades ─────────────────────────────────────

ROTA_ENTIDADE_MAP = {
    "/pdtic": "PDTIC",
    "/pacc": "PACC",
    "/projetos/servidores": "Equipe",
    "/projetos": "Projeto",
    "/contratos": "Contrato",
    "/fornecedores": "Fornecedor",
    "/catalogo": "Catálogo",
    "/usuarios": "Usuário",
    "/estrutura-organizacional": "Estrutura Organizacional",
    "/fabricantes": "Fabricante",
    "/empresas": "Empresa",
    "/configuracoes": "Configuração",
    "/auth": "Auth",
}


def _extrair_entidade(path: str) -> str:
    """Mapeia o path da rota para o nome da entidade de negócio."""
    # Remove o prefixo /api/v1 se existir
    clean = path.replace("/api/v1", "")
    for prefix, entidade in ROTA_ENTIDADE_MAP.items():
        if clean.startswith(prefix):
            return entidade
    return "Desconhecida"


def _extrair_acao(method: str) -> str:
    """Mapeia o método HTTP para o tipo de ação de auditoria."""
    return {
        "POST": "CREATE",
        "PUT": "UPDATE",
        "PATCH": "UPDATE",
        "DELETE": "DELETE",
    }.get(method.upper(), method.upper())


def _extrair_ip(request: Request) -> str:
    """Extrai o IP do cliente, considerando proxy reverso."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _extrair_usuario(token: str) -> tuple[Optional[int], Optional[str]]:
    """
    Extrai user_id e email do token JWT sem acessar o banco.
    Retorna (None, None) se o token for inválido.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None, None
        return None, email  # user_id será resolvido no registro
    except PyJWTError:
        return None, None


# ── Função utilitária para uso direto em routers ───────────────────────────

async def registrar_auditoria(
    db: AsyncSession,
    user: Optional[Usuario],
    acao: str,
    entidade: str,
    entidade_id: Optional[int] = None,
    detalhes: Optional[dict] = None,
    ip_address: Optional[str] = None,
    rota: Optional[str] = None,
    metodo_http: Optional[str] = None,
) -> None:
    """
    Registra um evento de auditoria diretamente no banco de dados.
    Uso típico: chamar dentro de um endpoint para logar detalhes
    granulares (ex: campos antigos vs novos).
    """
    try:
        log = AuditoriaLog(
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            detalhes=json.dumps(detalhes, ensure_ascii=False, default=str) if detalhes else None,
            ip_address=ip_address,
            rota=rota,
            metodo_http=metodo_http,
        )
        db.add(log)
        # O commit é gerenciado pela sessão do request (get_db)
    except Exception as exc:
        logger.warning("Falha ao registrar auditoria: %s", exc)


# ── Middleware ASGI ────────────────────────────────────────────────────────

METODOS_AUDITAVEIS = {"POST", "PUT", "PATCH", "DELETE"}
# Rotas que não devem gerar log de auditoria
ROTAS_IGNORADAS = {"/api/v1/auth/login", "/health", "/docs", "/redoc", "/openapi.json"}


class AuditoriaMiddleware(BaseHTTPMiddleware):
    """
    Middleware que intercepta requisições mutáveis e grava um registro
    de auditoria após a resposta ser processada com sucesso (2xx).

    Opera em modo silencioso: qualquer falha no log de auditoria é
    capturada e logada sem afetar a resposta ao cliente.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        method = request.method.upper()

        # Só audita métodos mutáveis
        if method not in METODOS_AUDITAVEIS:
            return await call_next(request)

        # Ignora rotas de sistema
        path = request.url.path
        if path in ROTAS_IGNORADAS:
            return await call_next(request)

        # Processa a requisição normalmente
        response = await call_next(request)

        # Só grava audit para respostas de sucesso (2xx)
        if 200 <= response.status_code < 300:
            try:
                await self._gravar_log(request, method, path, response.status_code)
            except Exception as exc:
                logger.warning("AuditoriaMiddleware falhou silenciosamente: %s", exc)

        return response

    async def _gravar_log(
        self,
        request: Request,
        method: str,
        path: str,
        status_code: int,
    ) -> None:
        """Grava o registro de auditoria em uma sessão independente."""
        # Extrair token do header Authorization
        auth_header = request.headers.get("Authorization", "")
        user_id = None
        user_email = None

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            # Resolver user_id a partir do email via banco
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_email = payload.get("sub")
            except PyJWTError:
                pass

        ip = _extrair_ip(request)
        entidade = _extrair_entidade(path)
        acao = _extrair_acao(method)

        # Usar sessão independente para não interferir na transação principal
        async with async_session_factory() as session:
            try:
                # Resolver user_id a partir do email
                if user_email:
                    result = await session.execute(
                        select(Usuario.id).where(Usuario.email == user_email)
                    )
                    row = result.scalar_one_or_none()
                    if row:
                        user_id = row

                log = AuditoriaLog(
                    user_id=user_id,
                    user_email=user_email,
                    acao=acao,
                    entidade=entidade,
                    detalhes=json.dumps(
                        {"path": path, "status_code": status_code},
                        ensure_ascii=False,
                    ),
                    ip_address=ip,
                    rota=path,
                    metodo_http=method,
                )
                session.add(log)
                await session.commit()
            except Exception as exc:
                await session.rollback()
                logger.warning("Erro ao gravar auditoria: %s", exc)
