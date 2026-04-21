"""
ITER TIC - Aplicação principal FastAPI

Ponto de entrada da API. Registra todos os routers dos módulos
de planejamento estratégico (PDTIC e PACC).
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.security import get_current_user

from app.api.routers import pdtic as pdtic_router
from app.api.routers import pacc as pacc_router
from app.api.routers import projetos as projetos_router
from app.api.routers import dashboard as dashboard_router
from app.api.routers import contratos as contratos_router
from app.api.routers import fabricantes as fabricantes_router
from app.api.routers import configuracoes as configuracoes_router
from app.api.routers import auth as auth_router

app = FastAPI(
    title="ITER TIC — API de Gestão de Licitações de TI",
    description=(
        "API para o sistema ITER TIC, cobrindo os módulos de "
        "Planejamento Estratégico (PDTIC e PACC), Projetos e Licitações "
        "e Painel de Indicadores (Dashboard), com rastreabilidade total "
        "e auditoria de compliance."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (ajuste as origens conforme o front-end) ──────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restringir em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ────────────────────────────────────────────────────────────────
# Protegemos todos os módulos com JWT, exceto as rotas de auth
app.include_router(pdtic_router.router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(pacc_router.router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(projetos_router.router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(dashboard_router.router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(contratos_router.router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(fabricantes_router.router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(configuracoes_router.router, prefix="/api/v1")

# Router de autenticação (público)
app.include_router(auth_router.router, prefix="/api/v1")


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "service": "ITER TIC API"}
