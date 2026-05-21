"""
ITER TIC - Servico de Envio de E-mail

Suporta dois modos:
  - PRODUCAO: Envio real via SMTP (quando SMTP_HOST esta configurado no .env)
  - DESENVOLVIMENTO: Loga o link de ativacao/reset no console do servidor
    com output EXTREMAMENTE VISIVEL para facilitar testes

Configuracao via .env:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL
"""

import sys
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger("iter-tic.email")


# ── Envio SMTP Real ────────────────────────────────────────────────────────

def _send_smtp(to: str, subject: str, html_body: str) -> None:
    """Envia e-mail via SMTP. Levanta excecao em caso de falha."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if settings.SMTP_USE_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(settings.SMTP_FROM, to, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER:
                    server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(settings.SMTP_FROM, to, msg.as_string())

        logger.info(f"[SMTP] E-mail enviado com sucesso para {to}")
        print(f"\n[SMTP] E-mail enviado com sucesso para {to}", file=sys.stderr)
    except Exception as e:
        logger.error(f"[SMTP] Falha ao enviar e-mail para {to}: {e}")
        print(f"\n[SMTP] FALHA ao enviar e-mail para {to}: {e}", file=sys.stderr)
        raise


# ── Console Log Gritante (DEV) ─────────────────────────────────────────────

def _dev_log(tipo: str, destinatario: str, nome: str, link: str) -> None:
    """
    Imprime no console do servidor um bloco EXTREMAMENTE VISIVEL
    com o link de ativacao/reset para testes em ambiente de desenvolvimento.
    """
    banner = f"""
{'#' * 70}
#{'=' * 68}#
#  {'':>2}{'[DEV] ' + tipo + ' GERADO':^62}  #
#{'=' * 68}#
#{'':>68}#
#  Destinatario: {destinatario:<52}#
#  Nome:         {nome:<52}#
#{'':>68}#
#  LINK (copie e cole no navegador):                                   #
#  {link:<66}#
#{'':>68}#
#{'=' * 68}#
{'#' * 70}
"""
    # Imprime em stderr para garantir que apareca mesmo com buffering
    print(banner, file=sys.stderr, flush=True)
    # Tambem imprime em stdout para redundancia
    print(banner, flush=True)

    logger.warning(f"[DEV] {tipo} -- Destinatario: {destinatario} -- Link: {link}")


# ── Templates HTML ─────────────────────────────────────────────────────────

def _template_ativacao(nome: str, link: str) -> str:
    return f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 16px; padding: 32px; color: white; text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px; font-size: 22px;">ITER TIC</h1>
            <p style="margin: 0; opacity: 0.85; font-size: 14px;">Sistema de Gestao de TIC</p>
        </div>
        <h2 style="color: #1e293b; font-size: 18px;">Bem-vindo(a), {nome}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Seu acesso ao sistema ITER TIC foi criado pelo administrador.
            Para ativar sua conta, defina uma senha clicando no botao abaixo:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="{link}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Ativar Minha Conta
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Este link expira em <strong>24 horas</strong>. Se voce nao solicitou este acesso, ignore este e-mail.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
            Caso o botao nao funcione, copie e cole o link abaixo no navegador:<br/>
            <a href="{link}" style="color: #818cf8; word-break: break-all;">{link}</a>
        </p>
    </div>
    """


def _template_reset(nome: str, link: str) -> str:
    return f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 16px; padding: 32px; color: white; text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px; font-size: 22px;">ITER TIC</h1>
            <p style="margin: 0; opacity: 0.85; font-size: 14px;">Recuperacao de Senha</p>
        </div>
        <h2 style="color: #1e293b; font-size: 18px;">Ola, {nome}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Recebemos uma solicitacao para redefinir a senha da sua conta.
            Clique no botao abaixo para criar uma nova senha:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="{link}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Redefinir Senha
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Este link expira em <strong>24 horas</strong>. Se voce nao solicitou a redefinicao, ignore este e-mail.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
            Caso o botao nao funcione, copie e cole o link abaixo no navegador:<br/>
            <a href="{link}" style="color: #818cf8; word-break: break-all;">{link}</a>
        </p>
    </div>
    """


# ── API Publica ────────────────────────────────────────────────────────────

def enviar_email_ativacao(destinatario: str, nome: str, token: str) -> None:
    """
    Envia e-mail de ativacao de conta com link contendo o token JWT.
    Em modo DEV (sem SMTP), loga o link no console de forma gritante.
    """
    link = f"{settings.FRONTEND_URL}/ativar-conta?token={token}"

    if settings.is_smtp_configured:
        html = _template_ativacao(nome, link)
        _send_smtp(destinatario, "ITER TIC -- Ative sua conta", html)
        _dev_log("LINK DE ATIVACAO (enviado via SMTP)", destinatario, nome, link)
    else:
        _dev_log("LINK DE ATIVACAO DE CONTA", destinatario, nome, link)


def enviar_email_reset(destinatario: str, nome: str, token: str) -> None:
    """
    Envia e-mail de recuperacao de senha com link contendo o token JWT.
    Em modo DEV (sem SMTP), loga o link no console de forma gritante.
    """
    link = f"{settings.FRONTEND_URL}/redefinir-senha?token={token}"

    if settings.is_smtp_configured:
        html = _template_reset(nome, link)
        _send_smtp(destinatario, "ITER TIC -- Redefinicao de Senha", html)
        _dev_log("LINK DE RESET (enviado via SMTP)", destinatario, nome, link)
    else:
        _dev_log("LINK DE REDEFINICAO DE SENHA", destinatario, nome, link)
