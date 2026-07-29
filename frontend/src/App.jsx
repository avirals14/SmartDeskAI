import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import PipelineDiagram from "./components/PipelineDiagram";
import TicketList from "./pages/TicketList";
import TicketDetail from "./pages/TicketDetail";
import NewTicket from "./pages/NewTicket";
import Search from "./pages/Search";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function ProtectedLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Smart<span>Desk</span> AI</div>
        <nav className="nav-links">
          <NavLink to="/" end>Tickets</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/new">New ticket</NavLink>
          <NavLink to="/search">Search</NavLink>
        </nav>
        <PipelineDiagram />
        <div className="user-box">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
          <button className="btn ghost" style={{ marginTop: 8, width: "100%" }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<TicketList />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/new" element={<NewTicket />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}
