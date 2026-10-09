import { z } from "zod";
import { ai, UNTRUSTED_DATA_RULE, untrusted } from "../../ai";
import { reviewsService } from "./reviews.service";

const KIND = "review_summary";
/** Below this, a "summary" would just restate one or two reviews. */
export const MIN_REVIEWS_FOR_SUMMARY = 3;

const summaryValidator = z.object({
  summary: z.string().min(1).max(500),
  positives: z.array(z.string().min(1).max(120)).max(3),
  negatives: z.array(z.string().min(1).max(120)).max(3),
});
export type ReviewSummary = z.infer<typeof summaryValidator>;

const summarySchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-3 sentences in Turkish summarising what renters and owners say." },
    positives: { type: "array", items: { type: "string" }, maxItems: 3, description: "Up to 3 short recurring praises." },
    negatives: { type: "array", items: { type: "string" }, maxItems: 3, description: "Up to 3 short recurring complaints; empty if none." },
  },
  required: ["summary", "positives", "negatives"],
};

const SYSTEM = [
  "You summarise reviews that people on a peer-to-peer rental platform wrote about one user after renting from or to them.",
  "Write in Turkish, in a neutral, factual tone. Mention only what several reviews agree on, or say clearly when something comes up once.",
  "Do not invent details, do not judge the person, and do not mention names, contact details or anything identifying.",
  "If the reviews are mostly ratings without comments, say that the comments are few.",
  UNTRUSTED_DATA_RULE,
].join("\n");

// Profiles are public and can be opened by anyone, so a summary is never
// generated while the request waits: a stale (or missing) one is returned at
// once and a fresh one is prepared in the background for the next view.
const inFlight = new Set<string>();

async function refresh(userId: string, input: { rating: number; comment: string | null }[]) {
  if (inFlight.has(userId)) return;
  inFlight.add(userId);
  try {
    await ai.cached(KIND, userId, input, summaryValidator, () =>
      ai.structured({
        kind: KIND,
        userId: null,
        tier: "fast",
        system: SYSTEM,
        parts: [{ text: "Summarise these reviews." }, untrusted("reviews", input)],
        schema: summarySchema,
        validator: summaryValidator,
        maxOutputTokens: 1024,
      }),
    );
  } catch (err) {
    console.error("Review summary could not be refreshed:", err);
  } finally {
    inFlight.delete(userId);
  }
}

export const reviewSummaryService = {
  /** The latest summary for a user's public reviews, or null. Never throws and never waits on the model. */
  async getForUser(userId: string): Promise<ReviewSummary | null> {
    if (!ai.isEnabled()) return null;
    const reviews = await reviewsService.listPublicForUser(userId);
    if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) return null;

    // Only what the reviews say: no reviewer names or ids reach the model.
    const input = [...reviews]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => ({ rating: r.rating, comment: r.comment }));

    const current = await ai.cachedIfCurrent(KIND, userId, input, summaryValidator);
    if (current) return current;
    void refresh(userId, input);
    return ai.stored(KIND, userId, summaryValidator);
  },

  /** Exposed for tests, which need to wait for the background refresh. */
  _refresh: refresh,
};
