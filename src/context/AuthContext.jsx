import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

import { API_URL } from "../config/api";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [providerProfile, setProviderProfile] = useState(() => {
    const saved = localStorage.getItem("providerProfile");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error("Session expired");
        }
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        setProviderProfile(data.provider);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.provider) {
          localStorage.setItem("providerProfile", JSON.stringify(data.provider));
        } else {
          localStorage.removeItem("providerProfile");
        }
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  function login(authData) {
    setToken(authData.token);
    setUser(authData.user);
    setProviderProfile(authData.provider || null);

    localStorage.setItem("token", authData.token);
    localStorage.setItem("user", JSON.stringify(authData.user));
    if (authData.provider) {
      localStorage.setItem("providerProfile", JSON.stringify(authData.provider));
    } else {
      localStorage.removeItem("providerProfile");
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setProviderProfile(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("providerProfile");
  }

  const value = {
    token,
    user,
    providerProfile,
    setProviderProfile,
    loading,
    isAuthenticated: Boolean(token && user),
    isCustomer: user?.role === "customer",
    isProvider: user?.role === "provider",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
