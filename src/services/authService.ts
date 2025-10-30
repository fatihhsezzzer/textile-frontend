import api from "./api";
import { LoginRequest, LoginResponse } from "../types";

// JWT token'ını decode eden utility function
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Token'ın expire olup olmadığını kontrol eden function
const isTokenExpired = (token: string) => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true; // Decode edilemiyorsa veya exp claim'i yoksa expired say
  }

  const currentTime = Date.now() / 1000; // seconds
  return decoded.exp < currentTime;
};

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/User/login", credentials);
    return response.data;
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdBy: string;
  }): Promise<any> => {
    const response = await api.post("/User/register", userData);
    return response.data;
  },

  // Token'ın backend'de geçerli olup olmadığını test et
  validateToken: async (): Promise<boolean> => {
    try {
      // Mevcut bir endpoint kullan (Orders endpoint'i authentication gerektiriyor)
      const response = await api.get("/Order");
      return response.status === 200;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return false; // Unauthorized
      }
      // Diğer hatalar (500, network vs.) için true döneriz çünkü token sorunu olmayabilir
      return true;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Clean up any invalid localStorage data
  cleanupLocalStorage: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token === "undefined" || token === "null") {
      localStorage.removeItem("token");
    }

    if (user === "undefined" || user === "null") {
      localStorage.removeItem("user");
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");

    if (!userStr || userStr === "undefined" || userStr === "null") {
      return null;
    }
    try {
      const user = JSON.parse(userStr);
      return user;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      localStorage.removeItem("user"); // Clear invalid data
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") {
      return false;
    }

    // Token expire kontrolü
    if (isTokenExpired(token)) {
      authService.logout(); // Expire olan token'ı temizle
      return false;
    }

    return true;
  },

  // Token'ın geçerli olup olmadığını kontrol et
  isTokenValid: () => {
    const token = authService.getToken();
    if (!token) return false;

    return !isTokenExpired(token);
  },

  // Safe accessor for the stored token. Returns null when token is missing or invalid.
  getToken: () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || token === "undefined" || token === "null") return null;
      return token;
    } catch (error) {
      console.warn("Could not read token from localStorage:", error);
      return null;
    }
  },
};
