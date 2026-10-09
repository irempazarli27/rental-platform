import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { isPlausibleEmailDomain } from "../../utils/emailValidity";
import { sha256, newTokenId } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { usersRepository } from "../users/users.repository";
import { toPrivateUserDto } from "../users/users.types";
import { tokensRepository } from "./tokens.repository";
import type { LoginInput, RegisterInput } from "./auth.validation";

const BCRYPT_ROUNDS = 12;

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

async function issueTokenPair(userId: string, role: "user" | "admin") {
  const accessToken = signAccessToken({ sub: userId, role });

  const tokenId = newTokenId();
  const refreshToken = signRefreshToken({ sub: userId, tokenId });
  const decoded = jwt.decode(refreshToken) as { exp: number };

  await tokensRepository.create({
    id: tokenId,
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
    }

    if (!(await isPlausibleEmailDomain(input.email))) {
      throw AppError.badRequest("Lütfen geçerli, gerçek bir e-posta adresi kullan", "IMPLAUSIBLE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await usersRepository.create({
      email: input.email,
      password_hash: passwordHash,
      full_name: input.fullName,
      phone: input.phone ?? null,
    });

    const tokens = await issueTokenPair(user.id, user.role);
    return { user: toPrivateUserDto(user), ...tokens };
  },

  async login(input: LoginInput) {
    const user = await usersRepository.findByEmail(input.email);
    if (!user) throw AppError.unauthorized("Invalid email or password");

    if (!user.password_hash) {
      throw AppError.unauthorized("This account uses Google sign-in. Please continue with Google.");
    }

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) throw AppError.unauthorized("Invalid email or password");

    if (user.status === "suspended") {
      throw AppError.forbidden("This account has been suspended");
    }

    const tokens = await issueTokenPair(user.id, user.role);
    return { user: toPrivateUserDto(user), ...tokens };
  },

  async loginWithGoogle(idToken: string) {
    if (!googleClient || !env.googleClientId) {
      throw new AppError(503, "Google sign-in is not configured", "GOOGLE_AUTH_DISABLED");
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      throw AppError.unauthorized("Invalid Google credential");
    }

    if (!payload?.sub || !payload.email) {
      throw AppError.unauthorized("Invalid Google credential");
    }

    let user = await usersRepository.findByGoogleId(payload.sub);

    if (!user) {
      const existingByEmail = await usersRepository.findByEmail(payload.email);
      user = existingByEmail
        ? await usersRepository.update(existingByEmail.id, { google_id: payload.sub })
        : await usersRepository.create({
            email: payload.email,
            password_hash: null,
            auth_provider: "google",
            google_id: payload.sub,
            full_name: payload.name ?? payload.email.split("@")[0],
            avatar_url: payload.picture ?? null,
            email_verified_at: payload.email_verified ? new Date() : null,
          });
    }

    if (user.status === "suspended") {
      throw AppError.forbidden("This account has been suspended");
    }

    const tokens = await issueTokenPair(user.id, user.role);
    return { user: toPrivateUserDto(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const stored = await tokensRepository.findById(payload.tokenId);
    if (!stored) throw AppError.unauthorized("Invalid refresh token");

    if (stored.revoked_at) {
      // Reuse of a rotated-out token: treat as possible theft and kill the session.
      await tokensRepository.revokeAllForUser(stored.user_id);
      throw AppError.unauthorized("Refresh token has already been used");
    }

    if (stored.token_hash !== sha256(refreshToken)) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    const user = await usersRepository.findById(stored.user_id);
    if (!user || user.status !== "active") {
      throw AppError.unauthorized("Account unavailable");
    }

    await tokensRepository.revoke(stored.id);
    const tokens = await issueTokenPair(user.id, user.role);
    return { user: toPrivateUserDto(user), ...tokens };
  },

  async logout(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await tokensRepository.revoke(payload.tokenId);
    } catch {
      // Already invalid/expired — logout is idempotent either way.
    }
  },
};
