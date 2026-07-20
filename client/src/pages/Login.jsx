import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import SuspensionInquiryModal from "../components/SuspensionInquiryModal";
import InquiryStatusModal from "../components/InquiryStatusModal";
import { suppressBack } from "../utils/historyUtils";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ErrorMessage from "../components/ui/ErrorMessage";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "student",
  });

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suspendedInfo, setSuspendedInfo] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await api.post("/api/auth/login", {
        email: form.email,
        password: form.password,
        role: form.role,
      });

      const backendRole = res.data.user.role;
      if (backendRole !== form.role) {
        setMessage(`You are registered as ${backendRole}`);
        return;
      }

      auth.login(res.data.token, backendRole);

      if (backendRole === "instructor") {
        navigate("/instructor", { replace: true });
      } else if (backendRole === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
      suppressBack();
    } catch (err) {
      const resErr = err.response?.data;
      console.error("Login error response:", err.response);

      if (
        err.response?.status === 403 &&
        (resErr?.error === "ACCOUNT_SUSPENDED" ||
          resErr?.suspensionReason ||
          resErr?.reason ||
          resErr?.suspendedUntil)
      ) {
        const reason =
          resErr?.suspensionReason || resErr?.reason || resErr?.message || "Account suspended";
        const endDateRaw = resErr?.suspensionEndDate || resErr?.suspendedUntil || null;
        const endDate = endDateRaw ? new Date(endDateRaw).toLocaleDateString() : null;

        setMessage(
          `Your account is suspended.\nReason: ${reason}${endDate ? `\nSuspended Until: ${endDate}` : ""}`
        );
        setSuspendedInfo({ email: form.email, reason, endDate });
      } else {
        setMessage(resErr?.message || err.message || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.isAuthenticated) {
      if (auth.role === "instructor") {
        navigate("/instructor", { replace: true });
      } else if (auth.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
      suppressBack();
    }
  }, [auth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to access your dashboard.</p>
        </div>

        {message && <ErrorMessage message={message} />}

        <form onSubmit={submit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              if (message) setMessage(null);
            }}
          />

          <Input
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              if (message) setMessage(null);
            }}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.role}
              onChange={(e) => {
                setForm({ ...form, role: e.target.value });
                if (message) setMessage(null);
              }}
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link className="font-medium text-blue-600 hover:underline" to="/register">
            Register
          </Link>
        </p>
      </div>

      {suspendedInfo && inquiryOpen && (
        <SuspensionInquiryModal
          isOpen={inquiryOpen}
          onClose={() => setInquiryOpen(false)}
          email={suspendedInfo.email}
          onSuccess={() => {
            setMessage("Your inquiry has been submitted. Admin will reply soon.");
            setSuspendedInfo(null);
          }}
        />
      )}

      {suspendedInfo && statusOpen && (
        <InquiryStatusModal
          isOpen={statusOpen}
          onClose={() => setStatusOpen(false)}
          email={suspendedInfo.email}
        />
      )}
    </div>
  );
}
