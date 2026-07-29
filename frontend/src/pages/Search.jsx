import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { PriorityBadge } from "../components/Badges";

export default function Search() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("keyword"); // keyword | semantic
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = mode === "semantic" ? await api.searchSemantic(q) : await api.search(q);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Search</h1>
      <p className="page-sub">
        {mode === "keyword"
          ? "Exact keyword search across MongoDB conversation text and AI-generated summaries."
          : "Vector similarity search over ticket embeddings stored in PostgreSQL (pgvector) \u2014 can match related tickets even without shared exact words."}
      </p>

      <div className="toolbar">
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "keyword" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setMode("keyword")}
          >
            Keyword
          </button>
          <button
            type="button"
            className={mode === "semantic" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setMode("semantic")}
          >
            Semantic (vector)
          </button>
        </div>
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="e.g. cant access my account, refund, crash\u2026"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 320 }}
        />
        <button className="btn accent" type="submit">Search</button>
      </form>

      <div className="card">
        {loading ? (
          <div className="empty-state">Searching\u2026</div>
        ) : !results ? (
          <div className="empty-state">Enter a term to search past tickets.</div>
        ) : results.length === 0 ? (
          <div className="empty-state">No matches found.</div>
        ) : (
          <table className="tickets">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>{mode === "semantic" ? "Similarity" : "Matched summary"}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.ticket.id} onClick={() => navigate(`/tickets/${r.ticket.id}`)}>
                  <td className="ticket-id">#{r.ticket.id}</td>
                  <td>{r.ticket.subject}</td>
                  <td><PriorityBadge priority={r.ticket.priority} /></td>
                  <td>
                    {mode === "semantic"
                      ? `${Math.round(r.similarity * 100)}%`
                      : r.matchedSummary || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
