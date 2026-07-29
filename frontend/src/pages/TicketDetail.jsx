import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { PriorityBadge, StatusBadge } from "../components/Badges";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getTicket(id);
      setTicket(data.ticket);
      setConversation(data.conversation);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(e) {
    const updated = await api.updateStatus(id, e.target.value);
    setTicket(updated);
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const updated = await api.addMessage(id, { sender: "agent", text: replyText });
      setConversation(updated);
      setReplyText("");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="empty-state">Loading ticket\u2026</div>;
  if (!ticket) return <div className="empty-state">Ticket not found.</div>;

  return (
    <div>
      <button className="btn ghost" style={{ marginBottom: 18 }} onClick={() => navigate("/")}>
        \u2190 Back to tickets
      </button>

      <h1 className="page-title">#{ticket.id} \u2014 {ticket.subject}</h1>
      <p className="page-sub">
        PostgreSQL record shown below. Conversation thread &amp; AI output come from MongoDB.
      </p>

      <div className="toolbar">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <span className="badge status-open" style={{ background: "#F1F1EF", color: "#565F52" }}>
          {ticket.category}
        </span>
        <select value={ticket.status} onChange={handleStatusChange} style={{ marginLeft: "auto" }}>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="thread">
            {conversation?.messages?.map((m, i) => (
              <div key={i} className={`message ${m.sender}`}>
                <div className="message-meta">{m.sender} \u00b7 {new Date(m.createdAt).toLocaleString()}</div>
                {m.text}
              </div>
            ))}
          </div>
          <form className="new-message" onSubmit={handleSendReply}>
            <textarea
              placeholder="Type an agent reply\u2026"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button className="btn accent" type="submit" disabled={sending}>
              {sending ? "Sending\u2026" : "Send"}
            </button>
          </form>
        </div>

        <div className="card ai-panel">
          <div>
            <h4>AI classification</h4>
            {ticket.ai_processed ? (
              <p>
                Category <strong>{ticket.category}</strong>, priority{" "}
                <strong>{ticket.priority}</strong> \u2014 assigned automatically by the AI worker.
              </p>
            ) : (
              <p className="processing-note">
                Not yet processed. Start the worker (<code>npm run worker</code>) to classify this ticket.
              </p>
            )}
          </div>

          <div>
            <h4>AI summary</h4>
            <p>{conversation?.aiSummary || "No summary generated yet."}</p>
          </div>

          <div className="reply-box">
            <h4>AI suggested reply</h4>
            <p>{conversation?.aiSuggestedReply || "No suggestion generated yet."}</p>
            {conversation?.aiSuggestedReply && (
              <button
                className="btn ghost"
                onClick={() => setReplyText(conversation.aiSuggestedReply)}
              >
                Use this reply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
