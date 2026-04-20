import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";

export default function Navbar() {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">E</span>
          <span>E-Learning Platform</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="/">
            Home
          </Link>
          {!auth?.isAuthenticated ? (
            <>
              <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="/register">
                Register
              </Link>
              <Button variant="primary" onClick={() => navigate("/login")}>Login</Button>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-500">{auth.role}</span>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
