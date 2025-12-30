import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { authService } from "../services/authService";
import api from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    const initializeAuth = async () => {
      // Clean up any invalid localStorage data first
      authService.cleanupLocalStorage();

      const storedToken = localStorage.getItem("token");
      const storedUser = authService.getCurrentUser();

      if (storedToken) {
        // Token geçerliliğini kontrol et
        if (authService.isTokenValid()) {
          // Axios header'ı set et
          try {
            api.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${storedToken}`;
          } catch (e) {
            console.warn("Could not set axios default header:", e);
          }

          // Backend ile token'ı validate et
          const isValidOnBackend = await authService.validateToken();

          if (isValidOnBackend) {
            setToken(storedToken);

            // User varsa set et, yoksa token'dan decode etmeye çalış
            if (storedUser) {
              setUser(storedUser);
            } else {
              // JWT'den user bilgisini çıkarmaya çalış
              try {
                const tokenPayload = JSON.parse(
                  atob(storedToken.split(".")[1])
                );

                // JWT'den minimal user objesi oluştur
                const userFromToken = {
                  userId: tokenPayload.sub || tokenPayload.nameid || "unknown",
                  email:
                    tokenPayload.email ||
                    tokenPayload[
                      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                    ] ||
                    "unknown",
                  firstName:
                    tokenPayload.given_name ||
                    tokenPayload[
                      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
                    ] ||
                    "User",
                  lastName:
                    tokenPayload.family_name ||
                    tokenPayload[
                      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
                    ] ||
                    "",
                  role:
                    tokenPayload.role ||
                    tokenPayload[
                      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
                    ] ||
                    "User",
                  isActive: true,
                };

                setUser(userFromToken);

                // localStorage'a geri kaydet
                localStorage.setItem("user", JSON.stringify(userFromToken));
              } catch (tokenError) {
                // Token geçerli ama user decode edilemiyor, logout yap
                authService.logout();
                setToken(null);
                setUser(null);
                delete api.defaults.headers.common["Authorization"];
              }
            }
          } else {
            // Backend validation failed
            authService.logout();
            setToken(null);
            setUser(null);
            delete api.defaults.headers.common["Authorization"];
          }
        } else {
          // Token expired veya geçersiz
          authService.logout();
          setToken(null);
          setUser(null);
        }
      } else {
        // Token yok
        setToken(null);
        setUser(null);
      }

      // Mark loading as complete
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    // set axios default header so subsequent requests include the token
    try {
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } catch (e) {
      console.warn("Could not set axios default header on login:", e);
    }
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    try {
      delete api.defaults.headers.common["Authorization"];
    } catch (e) {
      console.warn("Could not remove axios default header on logout:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
