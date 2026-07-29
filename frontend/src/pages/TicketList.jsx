import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { PriorityBadge, StatusBadge } from "../components/Badges";

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTickets(statusFilter ? { status: statusFilter } : {});
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div>
      <h1 className="page-title">Tickets</h1>
      <p className="page-sub">
        Structured fields (status, priority) live in PostgreSQL. Click a ticket to see its
        MongoDB conversation thread and AI-generated summary.
      </p>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button className="btn ghost" onClick={load}>Refresh</button>
        <button className="btn accent" onClick={() => navigate("/new")}>+ New ticket</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading tickets\u2026</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Couldn't load tickets</h3>
            <p>{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <h3>No tickets yet</h3>
            <p>Run <code>npm run seed</code> in the backend to load sample data, or create one.</p>
          </div>
        ) : (
          <table className="tickets">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                  <td className="ticket-id">#{t.id}</td>
                  <td>{t.subject}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td>{t.category}</td>
                  <td className="ticket-id">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
