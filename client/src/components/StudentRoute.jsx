import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../services/api";

export default function StudentRoute({ children }) {
  const auth = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      // if no token or wrong role, skip verification
      if (!auth?.token || auth.role !== "student") {
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

  // while verifying token, don't render children (prevents flicker/back-forward bypass)
  if (checking) return null;

  if (!auth?.isAuthenticated || auth.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
