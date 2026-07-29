import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await api.signup({ name, email, password, role });
      login(token, user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="brand" style={{ color: "var(--ink)", marginBottom: 4 }}>
          Smart<span>Desk</span> AI
        </div>
        <p className="page-sub" style={{ marginBottom: 20 }}>Create an account</p>

        <label>
          Full name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password (min. 8 characters)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label>
          Account type
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="customer">Customer (submits tickets)</option>
            <option value="agent">Agent (manages tickets)</option>
          </select>
        </label>

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button className="btn accent" type="submit" disabled={submitting} style={{ marginTop: 6 }}>
          {submitting ? "Creating account\u2026" : "Create account"}
        </button>

        <p className="page-sub" style={{ marginTop: 18, marginBottom: 0 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
