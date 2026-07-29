import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function NewTicket() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // userId is no longer sent from the client — the backend derives it
      // from the authenticated user's JWT (see routes/tickets.js).
      const { ticket } = await api.createTicket({ subject, message });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">New ticket</h1>
      <p className="page-sub">
        On submit: a row is written to PostgreSQL, a conversation document to MongoDB, and a job
        is queued in Redis for the AI worker to classify.
      </p>

      <form className="card form-grid" style={{ padding: 24 }} onSubmit={handleSubmit}>
        <label>
          Subject
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Unable to reset password"
            required
          />
        </label>
        <label>
          Message
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue\u2026"
            required
          />
        </label>
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="btn accent" type="submit" disabled={submitting}>
          {submitting ? "Submitting\u2026" : "Submit ticket"}
        </button>
      </form>
    </div>
  );
}
