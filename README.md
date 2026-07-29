# SmartDesk AI

An AI-powered support ticket system built to demonstrate the exact skill set
described in an SDE internship certificate: **full-stack development, AI
integration, scalable backend services, robust data pipelines, and
multi-database storage architecture (PostgreSQL, MongoDB, Redis).**

Since the first version, this project has grown to also include
**authentication, an analytics dashboard, vector-based semantic search, and
full containerization** of the whole app (not just its databases).

---

## 1. Architecture

```
                 ┌─────────────┐
   React UI ───▶ │  Express API │──▶ JWT auth (login/signup)
                 └──────┬──────┘
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
 PostgreSQL         MongoDB            Redis
 (users, tickets,   (conversation      (job queue,
 ticket_vectors     threads,           response cache,
 for semantic       AI text)           rate limiting)
 search)                                    │
                                             ▼
                                     ┌───────────────┐
                                     │   AI Worker    │
                                     │ (background    │
                                     │  process)      │
                                     └───────┬───────┘
                                             ▼
                                     Groq AI
                       (classify + summarize + suggest reply)
                                             │
                                             ▼
                              Embedding service → PostgreSQL/pgvector
                                (powers semantic search)
```

**Flow when a customer submits a ticket:**
1. `POST /api/tickets` (authenticated) writes the structured record to **PostgreSQL**.
2. The raw conversation message is written to **MongoDB** as a flexible document.
3. A job `{ ticketId }` is pushed onto a **Redis** list (`queue:ai_jobs`).
4. The API responds immediately — it does not wait on AI processing.
5. A separate **worker process** blocks on that Redis queue, picks up the job,
   calls the AI service to classify priority/category and draft a summary +
   suggested reply, writes those back into Postgres and MongoDB, **then
   computes a vector embedding of the ticket and stores it in PostgreSQL
   (pgvector)** for semantic search.

This is a real **producer/consumer data pipeline** — not just three databases
sitting next to each other. That queue-and-worker separation is the part
worth explaining carefully to faculty: it's *why* you need Redis at all,
beyond "it's fast."

---

## 2. Feature summary

| Area | What was added | Where |
|---|---|---|
| **Authentication** | JWT signup/login, bcrypt password hashing, role-based access (customer/agent/admin) | `services/authService.js`, `middleware/auth.js`, `routes/auth.js` |
| **Dashboard** | GROUP BY aggregations (tickets by status/priority/category, 14-day volume) rendered as charts | `routes/dashboard.js`, `frontend/src/pages/Dashboard.jsx` |
| **Semantic search** | Fixed-length vector embeddings, stored and queried via PostgreSQL's pgvector extension (cosine similarity, ANN index) | `services/embeddingService.js`, `models/vectorModel.js`, `routes/search.js` (`/semantic`) |
| **Full containerization** | Dockerfiles for backend and frontend; docker-compose now runs the entire app, not just the databases | `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.yml` |

---

## 3. Why each database, specifically

| Database | What it stores here | Why this DB and not another |
|---|---|---|
| **PostgreSQL** | `users` (incl. password hashes), `tickets`, `ticket_vectors` (embeddings) | Relational data needs strong consistency; pgvector lets the same database also serve as a vector index, avoiding a fourth data store. |
| **MongoDB** | `conversations` (message threads, attachments, AI summary/reply) | Shape varies per ticket — some threads are 1 message, some are 50. Rigid SQL columns would need constant migrations. |
| **Redis** | Job queue (`queue:ai_jobs`), ticket-list & dashboard cache, per-IP rate limit counters | Three distinct uses of the *same* tool: a list as a queue, TTL'd keys as a cache, and atomic counters for rate limiting. |

---

## 4. Semantic search — how it actually works (be ready to explain this)

`services/embeddingService.js` turns ticket text into a **128-dimensional
vector** using a *hashing-trick* TF-IDF approach: each word is hashed into one
of 128 buckets and weighted by frequency, then the vector is normalized. This
needs **no external embeddings API** (Groq doesn't expose a public
embeddings endpoint — production systems typically use a dedicated provider
such as Voyage AI for this).

What makes this a genuine demonstration of *vector search*, not just a
gimmick, is that the storage and query pattern is identical to what a real
system would use:
- Vectors are stored in a `vector(128)` column (pgvector extension).
- An `ivfflat` index is built for approximate nearest-neighbour search.
- Queries use the `<=>` cosine-distance operator to rank tickets by similarity.

**Be upfront about the honest limitation:** this is a *lexical/statistical*
embedding, not a deep transformer embedding, so it won't catch true synonyms
the way a model-based embedding would. If asked "is this real AI search?",
the accurate answer is: *the vector database mechanics are real and
production-shaped; the embedding function itself is a lightweight stand-in
that could be swapped for a transformer-based one (e.g. Voyage AI) by
changing a single file, without touching the storage or query logic.*

---

## 5. Project structure

```
smartdesk-ai/
├── docker-compose.yml          # Full stack: postgres(+pgvector), mongo, redis, backend, worker, frontend
├── .env.example                 # JWT_SECRET / GROQ_API_KEY for docker-compose
├── backend/
│   ├── Dockerfile
│   ├── server.js                # Express app entrypoint
│   ├── config/                  # DB connection setup (postgres.js, mongo.js, redis.js)
│   ├── models/                  # ticketModel, conversationModel, userModel, vectorModel
│   ├── routes/                  # auth.js, tickets.js, search.js, dashboard.js
│   ├── services/                # aiService.js, authService.js, embeddingService.js
│   ├── middleware/               # auth.js, cache.js, rateLimit.js
│   ├── worker/aiWorker.js        # Background queue consumer (AI + embeddings)
│   ├── pipeline/ingest.js        # Data ingestion pipeline (seed script)
│   ├── sampledata/raw_tickets.json
│   └── sql/init.sql              # Postgres schema incl. pgvector + auth
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── AuthContext.jsx       # JWT/session state
        └── pages/                # Login, Signup, Dashboard, TicketList, TicketDetail, NewTicket, Search
```

---

## 6. Running it — Option A: one command with Docker Compose

**Prerequisites:** Docker Desktop (or Docker Engine + Compose plugin).

```bash
cp .env.example .env        # optionally add your GROQ_API_KEY and a real JWT_SECRET
docker compose up --build
```

This builds and starts everything: PostgreSQL (with pgvector), MongoDB,
Redis, the backend API, the AI worker, and the frontend (served by nginx).

- Frontend: **http://localhost:8080**
- Backend API: **http://localhost:4000**

Log in with the seeded demo account — **aviral@example.com / demo1234** — or
sign up a new one. Then, in a separate terminal, load sample tickets and let
the worker process them so the dashboard and semantic search have data:

```bash
docker compose exec backend npm run seed
```

(The worker container is already running and will pick the jobs up
automatically — watch `docker compose logs -f worker`.)

---

## 7. Running it — Option B: manual (for development / understanding each piece)

**Prerequisites:** Node.js 18+, Docker Desktop (for the three databases only).

```bash
# 1. Start the databases only
docker compose up -d postgres mongo redis

# 2. Set up and start the backend API
cd backend
cp .env.example .env        # optionally add your GROQ_API_KEY
npm install
npm start                   # runs on http://localhost:4000

# 3. In a second terminal — load sample data through the pipeline
cd backend
npm run seed

# 4. In a third terminal — start the AI worker (processes the queue + embeddings)
cd backend
npm run worker

# 5. In a fourth terminal — start the frontend
cd frontend
npm install
npm run dev                 # opens on http://localhost:5173
```

**No Groq API key?** The AI service automatically falls back to a
rule-based mock classifier (see `backend/services/aiService.js`), so the
entire pipeline — queue, worker, database writes, embeddings — still runs
end-to-end for your demo.

---

## 8. A realistic build plan for understanding this deeply

If you're presenting this and want to be able to defend every line:

- **Day 1** — Get Docker running, apply `init.sql` (including the pgvector
  extension and `ticket_vectors` table), connect with `psql` and manually
  insert/query a row.
- **Day 2** — Wire up `config/postgres.js`, `models/ticketModel.js`, and
  `models/userModel.js`. Write a script that signs up a user and lists
  tickets — no Express yet.
- **Day 3** — Add MongoDB: `config/mongo.js`, `models/conversationModel.js`.
- **Day 4** — Add Redis: get the queue (`lPush`/`blPop`) working standalone,
  then wire in `middleware/cache.js` and `middleware/rateLimit.js`.
- **Day 5** — Build `services/aiService.js`, `services/embeddingService.js`,
  and `worker/aiWorker.js`. Run the full pipeline from curl/Postman.
- **Day 6** — Build `services/authService.js` + `middleware/auth.js`, then
  the React frontend (auth pages, ticket pages, dashboard, search toggle).
- **Day 7** — Containerize (Dockerfiles + docker-compose), rehearse the demo
  below, and be ready to open any single file and explain it line by line.

---


## 9. Limitations
- **Semantic search uses lexical (hashing-trick TF-IDF) embeddings, not deep transformer embeddings.** See section 4 for the precise, defensible framing.
- **No email verification or password reset flow.** Signup/login work, but account recovery is out of scope for this academic demo.
- **Single worker instance.** Works for a demo; a real system would run multiple workers and handle job failures/retries more carefully.
- **Rate limiting is per-IP, not per-user**, which is a coarser control than most production systems use once authentication exists.

Being upfront about these shows engineering maturity — it's more convincing
than pretending the project is production-complete.
