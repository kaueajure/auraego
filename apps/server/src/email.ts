import nodemailer from "nodemailer";
import { env } from "./config.js";

const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } });
const shell = (title: string, body: string, button: string, href: string) => `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#191611;color:#f8f2e6;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px"><table width="560" style="max-width:100%;background:#262018;border:1px solid #514633;border-radius:24px"><tr><td style="padding:36px"><div style="color:#f6b73c;font-size:13px;letter-spacing:3px;font-weight:bold">AURA &amp; EGO</div><h1 style="font-size:30px;margin:18px 0">${title}</h1><p style="color:#cfc4b3;line-height:1.6">${body}</p><a href="${href}" style="display:inline-block;background:#f6b73c;color:#191611;text-decoration:none;font-weight:bold;border-radius:999px;padding:14px 24px;margin-top:14px">${button}</a><p style="font-size:12px;color:#8f8577;margin-top:30px">Se você não solicitou isto, ignore esta mensagem.</p></td></tr></table></td></tr></table></body></html>`;

export async function sendVerification(email: string, username: string, token: string) {
  const href = `${env.FRONTEND_URL}/verificar-email?token=${encodeURIComponent(token)}`;
  await transport.sendMail({ from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`, to: email, subject: "Confirme sua presença — Aura & Ego", html: shell("Sua aura chegou.", `Olá, ${username}. Confirme seu e-mail para liberar treino, ranking e partidas 1v1. O link expira em 24 horas.`, "Verificar e-mail", href) });
}
export async function sendRecovery(email: string, token: string) {
  const href = `${env.FRONTEND_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await transport.sendMail({ from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`, to: email, subject: "Redefinição de senha — Aura & Ego", html: shell("Recupere sua conta.", "Use o botão abaixo para definir uma nova senha. O link é único e expira em uma hora.", "Redefinir senha", href) });
}
