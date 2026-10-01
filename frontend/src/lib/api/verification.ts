import { apiRequest } from "./client";

export interface VerificationStatus {
  level: "none" | "email" | "phone" | "id_verified";
  email: { verified: boolean; address: string };
  phone: { verified: boolean; number: string | null };
  id: { verified: boolean };
  demoMode: boolean;
  realEmail: boolean;
  points: { email: number; phone: number; id: number };
}

export interface SentCode {
  sent: boolean;
  expiresInMinutes: number;
  /** Only returned in demo mode, where no real email/SMS is sent. */
  demoCode?: string;
}

export function getVerification() {
  return apiRequest<{ verification: VerificationStatus }>("/api/verification");
}

export function sendEmailCode() {
  return apiRequest<SentCode>("/api/verification/email/send", { method: "POST", body: {} });
}

export function confirmEmailCode(code: string) {
  return apiRequest<{ verification: VerificationStatus }>("/api/verification/email/confirm", { method: "POST", body: { code } });
}

export function sendPhoneCode(phone: string) {
  return apiRequest<SentCode>("/api/verification/phone/send", { method: "POST", body: { phone } });
}

export function confirmPhoneCode(code: string) {
  return apiRequest<{ verification: VerificationStatus }>("/api/verification/phone/confirm", { method: "POST", body: { code } });
}

export function verifyId(tckn: string, consent: boolean) {
  return apiRequest<{ verification: VerificationStatus }>("/api/verification/id", { method: "POST", body: { tckn, consent } });
}
