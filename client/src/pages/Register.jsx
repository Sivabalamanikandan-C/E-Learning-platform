import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { suppressBack } from "../utils/historyUtils";
import api from "../services/api";
import ErrorMessage from "../components/ui/ErrorMessage";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      await api.post("/api/auth/register", form);
      navigate("/login", { replace: true });
      suppressBack();
    } catch (err) {
      const resErr = err.response?.data;
      setMessage(resErr?.message || err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500">Join as a student or instructor.</p>
        </div>

        {message && <ErrorMessage message={message} />}

        <form onSubmit={submit} className="space-y-4">
          <Input
            placeholder="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Input
            placeholder="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Account type</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Register"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link className="font-medium text-blue-600 hover:underline" to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
