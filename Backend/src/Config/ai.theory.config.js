import axios from "axios";

const COHERE_API_KEY = process.env.COHERE_API_KEY || "";
const COHERE_API_URL = "https://api.cohere.ai/v1/embed";

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const modelEmbeddingCache = new Map();
const inFlight = new Map();

// --- Cohere embeddings ---
async function getEmbeddingFromCohere(text) {
  if (!COHERE_API_KEY) {
    if (process.env.DEBUG_THEORY_EVAL === "true") console.warn("COHERE_API_KEY not set");
    return null;
  }

  // cache
  const cached = modelEmbeddingCache.get(text);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.emb;
  if (inFlight.has(text)) return inFlight.get(text);

  const p = (async () => {
    try {
      const resp = await axios.post(
        COHERE_API_URL,
        { texts: [text], model: "embed-english-light-v3.0" },
        {
          headers: {
            Authorization: `Bearer ${COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      const emb = resp.data?.embeddings?.[0] || null;
      if (emb) modelEmbeddingCache.set(text, { emb, ts: Date.now() });
      return emb;
    } catch (err) {
      if (process.env.DEBUG_THEORY_EVAL === "true") {
        console.error("[Cohere] embedding error:", err?.message, err?.response?.data);
      }
      return null;
    } finally {
      inFlight.delete(text);
    }
  })();

  inFlight.set(text, p);
  return p;
}

// --- Cosine Similarity ---
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, a2 = 0, b2 = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    a2 += a[i] * a[i];
    b2 += b[i] * b[i];
  }
  const denom = Math.sqrt(a2) * Math.sqrt(b2);
  return denom ? dot / denom : 0;
}

function similarityToMarks(sim, maxMarks) {
  if (sim >= 0.85) return maxMarks;
  if (sim >= 0.7) return Math.round(maxMarks * 0.75 * 100) / 100;
  if (sim >= 0.55) return Math.round(maxMarks * 0.5 * 100) / 100;
  if (sim >= 0.4) return Math.round(maxMarks * 0.25 * 100) / 100;
  return 0;
}

// --- fallback word overlap ---
function fallbackWordOverlap(student, model) {
  const sanitize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const sWords = new Set(sanitize(student));
  const mWords = new Set(sanitize(model));
  if (mWords.size === 0) return 0;
  let common = 0;
  for (const w of sWords) if (mWords.has(w)) common++;
  return common / mWords.size;
}

// --- Main function ---
export async function evaluateTheory(studentAnswer, modelAnswer, maxMarks = 5) {
  const s = (studentAnswer || "").trim();
  const m = (modelAnswer || "").trim();
  if (!s || !m)
    return { marks: 0, similarity: 0, debug: { note: "empty input" } };

  // Try Cohere
  const [embS, embM] = await Promise.all([
    getEmbeddingFromCohere(s),
    getEmbeddingFromCohere(m),
  ]);

  const debug = {
    embLengths: { student: embS ? embS.length : 0, model: embM ? embM.length : 0 },
  };

  if (embS && embM) {
    let sim = cosine(embS, embM);
    sim = Math.max(0, Math.min(1, sim));
    const marks = similarityToMarks(sim, maxMarks);
    debug.note = "used-cohere-embeddings";
    return { marks, similarity: sim, debug };
  }

  // fallback
  const overlap = fallbackWordOverlap(s, m);
  debug.fallbackScore = overlap;
  debug.note = "fallback-word-overlap";
  let fallbackMarks = 0;
  if (overlap >= 0.8) fallbackMarks = maxMarks;
  else if (overlap >= 0.6) fallbackMarks = Math.round(maxMarks * 0.7 * 100) / 100;
  else if (overlap >= 0.4) fallbackMarks = Math.round(maxMarks * 0.5 * 100) / 100;
  else if (overlap >= 0.2) fallbackMarks = Math.round(maxMarks * 0.25 * 100) / 100;

  return { marks: fallbackMarks, similarity: 0, debug };
}
