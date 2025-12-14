import axios from "axios";

const API_BASE_URL = "https://api.bulutalbum.com/api"; // HTTPS geri döndü

// HTTPS sertifika doğrulamasını geçici olarak gevşet (sadece development)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout (QR kod oluşturma için artırıldı)
  headers: {
    "Content-Type": "application/json",
  },
});

// If a token exists in localStorage when the module loads, set the default
// Authorization header so requests from the first render include it.
try {
  const existingToken = localStorage.getItem("token");
  if (
    existingToken &&
    existingToken !== "undefined" &&
    existingToken !== "null" &&
    existingToken.length > 0
  ) {
    // Basit token format kontrolü (JWT should have 3 parts)
    const tokenParts = existingToken.split(".");
    if (tokenParts.length === 3) {
      api.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
      console.log("API: Set default Authorization header from localStorage");
    } else {
      console.warn("API: Invalid token format in localStorage, clearing");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
} catch (e) {
  // localStorage might not be available in some environments; ignore failures
  // but keep request interceptor as a fallback.
  console.warn("Could not read token from localStorage during api init:", e);
}

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    console.log("Making API request:", {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      hasAuthHeader: !!config.headers.Authorization,
    });

    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      // Basit token format kontrolü
      const tokenParts = token.split(".");
      if (tokenParts.length === 3) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Request interceptor: Added Authorization header");
      } else {
        console.warn(
          "Request interceptor: Invalid token format, clearing localStorage"
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else {
      console.log("Request interceptor: No valid token found");
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response);
    return response;
  },
  (error) => {
    console.error("API Error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      request: error.request,
      config: error.config,
    });

    // Log the response data specifically for 400 errors
    if (error.response?.status === 400) {
      console.error("400 Bad Request Details:", {
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data,
        requestDataParsed: (() => {
          try {
            return JSON.parse(error.config?.data || "{}");
          } catch {
            return error.config?.data;
          }
        })(),
        responseData: error.response?.data,
        validationErrors: error.response?.data?.errors,
        title: error.response?.data?.title,
        detail: error.response?.data?.detail,
        type: error.response?.data?.type,
        status: error.response?.data?.status,
        traceId: error.response?.data?.traceId,
      });

      // Additional parsing for common ASP.NET Core validation responses
      if (error.response?.data?.errors) {
        console.error(
          "Validation errors breakdown:",
          error.response.data.errors
        );

        // Parse and display each validation error individually
        Object.keys(error.response.data.errors).forEach((field) => {
          const fieldErrors = error.response.data.errors[field];
          console.error(`❌ ${field} errors:`, fieldErrors);
          fieldErrors.forEach((errorMsg: string, index: number) => {
            console.error(`   ${index + 1}. ${errorMsg}`);
          });
        });
      }
    }

    if (error.response?.status === 401) {
      console.log("401 Unauthorized - Token invalid or expired");

      // Token'ı ve user'ı localStorage'dan temizle
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Axios default headers'ı temizle
      delete api.defaults.headers.common["Authorization"];

      // Login sayfasına yönlendir
      if (window.location.pathname !== "/login") {
        console.log("Redirecting to login due to 401");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper function for making API requests
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }

      // Try to get error message from response body
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error("Backend Error Response:", errorData); // Debug log

        if (errorData) {
          // Handle ASP.NET validation errors
          if (errorData.errors) {
            const validationErrors = Object.entries(errorData.errors)
              .map(
                ([field, messages]: [string, any]) =>
                  `${field}: ${
                    Array.isArray(messages) ? messages.join(", ") : messages
                  }`
              )
              .join("\n");
            errorMessage = `Validation errors:\n${validationErrors}`;
          } else if (errorData.message || errorData.title || errorData.error) {
            errorMessage =
              errorData.message ||
              errorData.title ||
              errorData.error ||
              errorMessage;
          }
        }
      } catch (e) {
        // If response is not JSON, use text
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch (e2) {
          // Use default message
        }
      }

      throw new Error(errorMessage);
    }

    // Check if response has content
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  } catch (error) {
    console.error("API Request failed:", error);
    throw error;
  }
};
