import nodemailer from "nodemailer";
import { env } from "../config/env";

const transport = env.smtp
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      // 465 is implicit TLS; other ports (587) upgrade with STARTTLS.
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const mailer = {
  /** False when no SMTP server is configured — callers fall back to demo mode. */
  isConfigured(): boolean {
    return transport !== null;
  },

  async sendVerificationCode(to: string, code: string, expiresInMinutes: number): Promise<void> {
    if (!transport || !env.smtp) throw new Error("SMTP is not configured");
    await transport.sendMail({
      from: env.smtp.from,
      to,
      subject: `Paylaşımlık doğrulama kodun: ${code}`,
      text: `Merhaba,\n\nPaylaşımlık e-posta doğrulama kodun: ${code}\n\nKod ${expiresInMinutes} dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.\n`,
      html: `<p>Merhaba,</p><p>Paylaşımlık e-posta doğrulama kodun:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace">${code}</p><p>Kod ${expiresInMinutes} dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>`,
    });
  },

  /** Mirrors an in-app notification. Title and body can contain user-written text. */
  async sendNotification(to: string, title: string, body: string, url: string): Promise<void> {
    if (!transport || !env.smtp) throw new Error("SMTP is not configured");
    await transport.sendMail({
      from: env.smtp.from,
      to,
      subject: `Paylaşımlık: ${title}`,
      text: `${title}\n\n${body}\n\nGörüntülemek için: ${url}\n`,
      html: `<p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">Paylaşımlık'ta görüntüle</a></p>`,
    });
  },
};
