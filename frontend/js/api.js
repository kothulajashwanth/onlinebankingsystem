/**
 * REAL BACKEND API CLIENT
 * 
 * Replaces all mock data and local fake stores.
 * Connects directly to Java Backend endpoints over HTTP.
 * Complies with requirement:
 * - "The application must work with REAL user data."
 * - "The frontend must NEVER be trusted to determine balance, funds, or results."
 * - "All important financial decisions must happen in Java/backend/database logic."
 */

window.AegisApi = (function () {
  const API_BASE = ""; // Relative path to Java server root

  function getToken() {
    return sessionStorage.getItem("aegis_session_token");
  }

  function setToken(token) {
    if (token) {
      sessionStorage.setItem("aegis_session_token", token);
    } else {
      sessionStorage.removeItem("aegis_session_token");
    }
  }

  async function request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["X-Auth-Token"] = token;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: "Unexpected server response."
      }));

      return {
        ok: response.ok,
        status: response.status,
        ...data
      };
    } catch (err) {
      console.error("[AegisApi] Network Error:", err);
      return {
        ok: false,
        success: false,
        message: "Unable to connect to the banking backend server. Please verify the Java server is running."
      };
    }
  }

  return {
    isLoggedIn: function () {
      return !!getToken();
    },

    setSessionToken: setToken,

    // 1. REAL REGISTRATION
    register: async function (formData) {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.success && res.token) {
        setToken(res.token);
      }
      return res;
    },

    // 2. REAL LOGIN
    login: async function (username, password) {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      if (res.success && res.token) {
        setToken(res.token);
      }
      return res;
    },

    // 3. REAL LOGOUT
    logout: async function () {
      await request("/api/auth/logout", { method: "POST" });
      setToken(null);
    },

    // 4. REAL ACCOUNT DETAILS
    getAccountDetails: async function () {
      return await request("/api/account/details", { method: "GET" });
    },

    // 5. REAL DEPOSIT
    deposit: async function (amount, description) {
      return await request("/api/account/deposit", {
        method: "POST",
        body: JSON.stringify({ amount: amount.toString(), description })
      });
    },

    // 6. REAL WITHDRAWAL
    withdraw: async function (amount, description) {
      return await request("/api/account/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: amount.toString(), description })
      });
    },

    // 7. REAL BENEFICIARY LOOKUP
    lookupReceiver: async function (accountNumber) {
      return await request("/api/account/lookup", {
        method: "POST",
        body: JSON.stringify({ accountNumber })
      });
    },

    // 8. REAL FUND TRANSFER
    transfer: async function (receiverAccount, amount, description) {
      return await request("/api/transfer", {
        method: "POST",
        body: JSON.stringify({
          receiverAccount,
          amount: amount.toString(),
          description
        })
      });
    },

    // 9. REAL TRANSACTION HISTORY
    getTransactions: async function () {
      return await request("/api/transactions", { method: "GET" });
    },

    // 10. REAL PROFILE UPDATE
    updateProfile: async function (profileData) {
      return await request("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify(profileData)
      });
    },

    // 11. REAL PASSWORD UPDATE
    updatePassword: async function (currentPassword, newPassword) {
      return await request("/api/user/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },

    // Format currency in Indian Rupee standard (₹)
    formatCurrency: function (amt) {
      const num = parseFloat(amt) || 0;
      return "₹" + num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    // Format ISO/SQL date
    formatDate: function (dateStr) {
      if (!dateStr) return "N/A";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) + " " + d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };
})();
