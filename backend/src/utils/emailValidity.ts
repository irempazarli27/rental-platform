import { resolveMx } from "node:dns/promises";

// A representative set of well-known disposable/temporary-inbox domains.
// Not exhaustive — new ones appear constantly — but catches the common ones
// people actually use to dodge registration.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "dispostable.com",
  "fakeinbox.com",
  "sharklasers.com",
  "getnada.com",
  "maildrop.cc",
  "mohmal.com",
  "mailnesia.com",
  "moakt.com",
  "emailondeck.com",
  "spamgourmet.com",
]);

/**
 * Best-effort check that an email's domain could plausibly receive mail:
 * rejects known disposable-inbox providers and domains with no MX records
 * (nonsense/typo'd domains). Cannot and does not confirm the specific
 * mailbox exists — that would require actually sending a verification email.
 * Fails open (treats as valid) on DNS lookup errors, since a transient
 * resolver hiccup shouldn't block a real signup.
 */
export async function isPlausibleEmailDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;

  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    return true;
  }
}
