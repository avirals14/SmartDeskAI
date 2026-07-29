// Embedding service — produces fixed-length (128-dim) numeric vectors from
// text using the "hashing trick": each token is hashed into one of 128
// buckets and weighted by term frequency, then the vector is L2-normalized.
// This needs no external embeddings API (Groq does not expose a public
// embeddings endpoint; a production system would typically call a
// dedicated embeddings provider such as Voyage AI instead).
//
// This is a lexical/statistical embedding, not a deep transformer
// embedding — it will not capture synonyms the way a model like Voyage's
// would. What it DOES demonstrate faithfully is the full vector-search
// *pattern*: fixed-dimension vectors, cosine similarity, an ANN index
// (ivfflat) in Postgres via pgvector, and a query embedded the same way as
// the documents it's compared against. Swapping in real transformer
// embeddings later only requires changing this one file.

const DIMENSIONS = 128;

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "or", "in", "on", "for", "with", "this", "that", "it", "i", "my",
  "we", "you", "your", "at", "as", "but", "not", "have", "has", "had", "do",
  "does", "did", "so", "if", "will", "would", "can", "could", "please",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Simple deterministic string hash (djb2), used to bucket tokens.
function hashToken(token) {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 33) ^ token.charCodeAt(i);
  }
  return Math.abs(hash);
}

function embed(text) {
  const tokens = tokenize(text);
  const vector = new Array(DIMENSIONS).fill(0);

  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    const bucket = hashToken(token) % DIMENSIONS;
    vector[bucket] += 1;
  }

  // Term-frequency normalization, then L2 normalization so cosine
  // similarity (used by pgvector's <=> operator) behaves consistently
  // regardless of document length.
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

// pgvector expects a literal string like "[0.1,0.2,...]"
function toPgVectorLiteral(vector) {
  return `[${vector.join(",")}]`;
}

module.exports = { embed, toPgVectorLiteral, DIMENSIONS };
