// MVP-lite moderation: flag likely phone numbers or emails so an admin can review
// later — never blocks sending. A real system would also warn the sender client-side.
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;

export function looksLikeContactInfo(text: string): boolean {
  return PHONE_PATTERN.test(text) || EMAIL_PATTERN.test(text);
}
