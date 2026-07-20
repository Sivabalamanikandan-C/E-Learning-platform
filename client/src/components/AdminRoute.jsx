import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminRoute({ children }) {
  const auth = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (!auth?.token || auth.role !== "admin") {
        if (isMounted) setChecking(false);
        return;
      }

      try {
        await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (isMounted) setChecking(false);
      } catch (err) {
        auth.logout();
        if (isMounted) setChecking(false);
      }
    };

    verify();
    return () => {
      isMounted = false;
    };
  }, [auth?.role, auth?.token]);

  if (checking) return null;

  if (!auth?.isAuthenticated || auth.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
