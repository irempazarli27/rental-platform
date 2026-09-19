import { randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { sha256 } from "../../utils/hash";
import { usersRepository } from "../users/users.repository";
import { VERIFICATION_POINTS } from "../trust/trust.score";
import { verificationRepository } from "./verification.repository";
import { hashIdNumber, isValidTckn, maxLevel, normalizeTrPhone } from "./verification.rules";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface VerificationStatus {
  level: "none" | "email" | "phone" | "id_verified";
  email: { verified: boolean; address: string };
  phone: { verified: boolean; number: string | null };
  id: { verified: boolean };
  demoMode: boolean;
  /** Trust points each step adds on top of the previous one. */
  points: { email: number; phone: number; id: number };
}

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

async function loadUser(userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export const verificationService = {
  async getStatus(userId: string): Promise<VerificationStatus> {
    const user = await loadUser(userId);
    return {
      level: user.verification_level,
      email: { verified: user.email_verified_at !== null, address: user.email },
      phone: { verified: user.phone_verified_at !== null, number: user.phone_verified_at ? user.phone : null },
      id: { verified: user.id_verified_at !== null },
      demoMode: env.verificationDemoMode,
      points: {
        email: VERIFICATION_POINTS.email,
        phone: VERIFICATION_POINTS.phone - VERIFICATION_POINTS.email,
        id: VERIFICATION_POINTS.id_verified - VERIFICATION_POINTS.phone,
      },
    };
  },

  /**
   * Issues a 6-digit code. There is no real email/SMS provider yet, so in demo
   * mode the code is handed back in the response; outside demo mode this fails
   * loudly instead of pretending a message was sent.
   */
  async sendCode(userId: string, channel: "email" | "phone", phoneInput?: string) {
    const user = await loadUser(userId);

    let target: string;
    if (channel === "email") {
      if (user.email_verified_at) throw AppError.conflict("E-posta zaten doğrulanmış", "ALREADY_VERIFIED");
      target = user.email;
    } else {
      if (!user.email_verified_at) {
        throw AppError.conflict("Önce e-postanı doğrulamalısın", "EMAIL_NOT_VERIFIED");
      }
      if (user.phone_verified_at) throw AppError.conflict("Telefon zaten doğrulanmış", "ALREADY_VERIFIED");
      const normalized = phoneInput ? normalizeTrPhone(phoneInput) : null;
      if (!normalized) throw AppError.badRequest("Geçerli bir cep telefonu numarası gir (05XX XXX XX XX)", "INVALID_PHONE");
      if (await verificationRepository.findOtherVerifiedPhoneOwner(normalized, userId)) {
        throw AppError.conflict("Bu telefon numarası başka bir hesapta doğrulanmış", "PHONE_TAKEN");
      }
      target = normalized;
    }

    if (!env.verificationDemoMode) {
      throw new AppError(503, "Doğrulama sağlayıcısı henüz yapılandırılmadı", "VERIFICATION_PROVIDER_NOT_CONFIGURED");
    }

    const code = String(randomInt(100000, 1000000));
    await verificationRepository.replaceCode({
      userId,
      channel,
      target,
      codeHash: sha256(`${userId}:${channel}:${code}`),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    return { sent: true, expiresInMinutes: CODE_TTL_MS / 60000, demoCode: code };
  },

  async confirmCode(userId: string, channel: "email" | "phone", code: string) {
    const row = await verificationRepository.findCode(userId, channel);
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      if (row) await verificationRepository.deleteCode(row.id);
      throw AppError.badRequest("Kodun süresi dolmuş, yeni kod iste", "CODE_EXPIRED");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await verificationRepository.deleteCode(row.id);
      throw AppError.badRequest("Çok fazla hatalı deneme, yeni kod iste", "TOO_MANY_ATTEMPTS");
    }

    if (!safeEqualHex(row.code_hash, sha256(`${userId}:${channel}:${code}`))) {
      await verificationRepository.incrementAttempts(row.id);
      const left = MAX_ATTEMPTS - row.attempts - 1;
      throw AppError.badRequest(`Kod hatalı (${left} deneme hakkın kaldı)`, "INVALID_CODE");
    }

    await verificationRepository.deleteCode(row.id);
    const user = await loadUser(userId);
    if (channel === "email") {
      await usersRepository.update(userId, {
        email_verified_at: new Date(),
        verification_level: maxLevel(user.verification_level, "email"),
      });
    } else {
      await usersRepository.update(userId, {
        phone: row.target,
        phone_verified_at: new Date(),
        verification_level: maxLevel(user.verification_level, "phone"),
      });
    }
    return this.getStatus(userId);
  },

  /**
   * DEMO identity step. It validates the ID number's structure and enforces one
   * ID per account, but does NOT check it against any registry or match a face —
   * a real deployment would delegate that to a licensed provider. The number
   * itself is never stored, only a keyed one-way hash.
   */
  async verifyId(userId: string, tckn: string) {
    const user = await loadUser(userId);
    if (user.id_verified_at) throw AppError.conflict("Kimlik zaten doğrulanmış", "ALREADY_VERIFIED");
    if (!user.phone_verified_at) throw AppError.conflict("Önce telefonunu doğrulamalısın", "PHONE_NOT_VERIFIED");
    if (!isValidTckn(tckn)) throw AppError.badRequest("Geçersiz T.C. kimlik numarası", "INVALID_ID_NUMBER");

    const hash = hashIdNumber(tckn);
    if (await verificationRepository.findOtherByIdHash(hash, userId)) {
      throw AppError.conflict("Bu kimlik numarası başka bir hesapta kullanılmış", "ID_ALREADY_USED");
    }

    const now = new Date();
    await usersRepository.update(userId, {
      id_verified_at: now,
      id_number_hash: hash,
      verification_consent_at: now,
      verification_level: "id_verified",
    });
    return this.getStatus(userId);
  },
};
