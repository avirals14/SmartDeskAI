import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const [email, setEmail] = useState("aviral@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await api.login({ email, password });
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
        <p className="page-sub" style={{ marginBottom: 20 }}>Sign in to your account</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button className="btn accent" type="submit" disabled={submitting} style={{ marginTop: 6 }}>
          {submitting ? "Signing in\u2026" : "Sign in"}
        </button>

        <p className="page-sub" style={{ marginTop: 18, marginBottom: 0 }}>
          Demo account: aviral@example.com / demo1234
        </p>
        <p className="page-sub" style={{ marginTop: 4 }}>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}
