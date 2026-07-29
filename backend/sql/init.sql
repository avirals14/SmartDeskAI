-- SmartDesk AI - PostgreSQL schema
-- This holds the STRUCTURED, RELATIONAL data: users and ticket core records.
-- Why Postgres: strong consistency + relations (a ticket always belongs to
-- exactly one user, status/priority are constrained enums) — a good fit for
-- relational integrity, unlike the free-form conversation data (which lives
-- in MongoDB) or the ephemeral cache/queue data (which lives in Redis).

-- pgvector extension — enables the `vector` column type and cosine-distance
-- operator (<=>) used below for semantic search over ticket embeddings.
-- Requires the pgvector/pgvector Docker image (see docker-compose.yml).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(100),                   -- NULL for users created only via data ingestion (no login)
    role VARCHAR(20) NOT NULL DEFAULT 'customer',  -- customer | agent | admin
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',      -- open | in_progress | resolved | closed
    priority VARCHAR(10) NOT NULL DEFAULT 'unset',   -- low | medium | high | urgent | unset
    category VARCHAR(50) DEFAULT 'uncategorized',    -- set by the AI classifier
    ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
    mongo_thread_id VARCHAR(64),                     -- link to the MongoDB conversation document
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);

-- Ticket embeddings for semantic search. One row per ticket, computed by the
-- AI worker once a conversation summary exists (see worker/aiWorker.js and
-- services/embeddingService.js). 128-dim fixed-size vectors, produced via a
-- deterministic hashing-trick TF-IDF embedding — no external embeddings API
-- required, but the same pgvector query pattern used here (cosine distance,
-- ANN index) is exactly what a production system would use with real
-- transformer embeddings (e.g. Voyage AI) dropped in as a replacement.
CREATE TABLE IF NOT EXISTS ticket_vectors (
    ticket_id INTEGER PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    embedding VECTOR(128) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Approximate nearest-neighbour index for fast cosine-similarity search.
CREATE INDEX IF NOT EXISTS idx_ticket_vectors_embedding
    ON ticket_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Seed a demo login user so the app works out of the box.
-- Password: demo1234  (hash generated with bcryptjs, 10 rounds)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Aviral Sharma', 'aviral@example.com', '$2a$10$moD17vZrtNQbHwUAF1THnuaqnErj1tyQcwaNldLilvASmpI2cYsvq', 'admin')
ON CONFLICT (email) DO NOTHING;
