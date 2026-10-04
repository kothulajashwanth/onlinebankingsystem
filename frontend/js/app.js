/**
 * MAIN APPLICATION ROUTER & STATE COORDINATOR
 * 
 * Secure Online Banking and Fund Transfer System
 */

window.AegisApp = (function () {
  let activeRoute = "login";
  let clockInterval = null;

  const routes = {
    login: { title: "Sign In", desc: "Access your secure digital banking portal", isAuth: false },
    register: { title: "Open Account", desc: "Digital account registration and verification", isAuth: false },
    dashboard: { title: "Dashboard", desc: "Overview of your account and recent activities", isAuth: true },
    account: { title: "My Account", desc: "Detailed breakdown of account specifics and status", isAuth: true },
    deposit: { title: "Deposit Funds", desc: "Deposit capital instantly into your savings account", isAuth: true },
    withdraw: { title: "Cash Withdrawal", desc: "Initiate secure external withdrawal or cash checkout", isAuth: true },
    transfer: { title: "Fund Transfer", desc: "Inter-bank & intra-bank digital remittance", isAuth: true },
    transactions: { title: "Transaction History", desc: "Full audit trail and downloadable account statement", isAuth: true },
    profile: { title: "Customer Profile", desc: "Manage personal particulars and verified credentials", isAuth: true },
    settings: { title: "Security & Settings", desc: "Configure alerts, authentication and privacy preferences", isAuth: true }
  };

  function init() {
    setupHashRouting();
    setupNavigationEvents();
    setupClock();
    setupNotificationPopover();
    setupMobileSidebar();

    // Check if already authenticated
    const initialHash = window.location.hash.replace("#", "") || (window.AegisApi.isLoggedIn() ? "dashboard" : "login");
    navigateTo(initialHash);
  }

  function setupHashRouting() {
    window.addEventListener("hashchange", function () {
      const hash = window.location.hash.replace("#", "");
      if (routes[hash]) {
        navigateTo(hash, false);
      }
    });
  }

  function navigateTo(routeName, updateHash = true) {
    if (!routes[routeName]) routeName = "login";

    // Authentication Guard
    if (routes[routeName].isAuth && !window.AegisApi.isLoggedIn()) {
      routeName = "login";
    }

    // If already logged in and navigating to login/register, send to dashboard
    if (!routes[routeName].isAuth && window.AegisApi.isLoggedIn() && (routeName === "login" || routeName === "register")) {
      // Allow user to visit register/login if they intentionally want to
    }

    activeRoute = routeName;

    if (updateHash) {
      window.location.hash = routeName;
    }

    // Toggle full-screen auth wrapper vs main-app layout
    const authWrapper = document.getElementById("auth-wrapper-section");
    const appLayout = document.getElementById("main-app-layout");
    const loginView = document.getElementById("view-login");
    const registerView = document.getElementById("view-register");

    if (routeName === "login" || routeName === "register") {
      if (authWrapper) authWrapper.style.display = "flex";
      if (appLayout) appLayout.style.display = "none";

      if (loginView) loginView.style.display = routeName === "login" ? "block" : "none";
      if (registerView) registerView.style.display = routeName === "register" ? "block" : "none";

      if (routeName === "login") window.AegisAuthPage.initLogin();
      if (routeName === "register") window.AegisAuthPage.initRegister();
      return;
    }

    // Authenticated screens
    if (authWrapper) authWrapper.style.display = "none";
    if (appLayout) appLayout.style.display = "flex";

    // Update Topbar
    const pageTitle = document.getElementById("topbar-page-title");
    const pageDesc = document.getElementById("topbar-page-desc");
    if (pageTitle) pageTitle.textContent = routes[routeName].title;
    if (pageDesc) pageDesc.textContent = routes[routeName].desc;

    // Update Sidebar Active state
    document.querySelectorAll(".sidebar-nav .nav-link").forEach(link => {
      const target = link.getAttribute("data-route");
      if (target === routeName) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Toggle View Sections
    document.querySelectorAll(".app-page-view").forEach(view => {
      view.style.display = "none";
    });

    const activeView = document.getElementById(`view-${routeName}`);
    if (activeView) {
      activeView.style.display = "block";
      activeView.classList.remove("fade-in");
      void activeView.offsetWidth; // Force reflow to retrigger animation
      activeView.classList.add("fade-in");
    }

    // Close mobile sidebar if open
    closeMobileSidebar();

    // Trigger page-specific renders
    updateSidebarUser();
    if (routeName === "dashboard") window.AegisDashboardPage.render();
    if (routeName === "account") window.AegisAccountPage.render();
    if (routeName === "deposit") window.AegisDepositPage.render();
    if (routeName === "withdraw") window.AegisWithdrawPage.render();
    if (routeName === "transfer") window.AegisTransferPage.render();
    if (routeName === "transactions") window.AegisTransactionsPage.render();
    if (routeName === "profile") window.AegisProfilePage.render();
    if (routeName === "settings") window.AegisSettingsPage.render();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupNavigationEvents() {
    document.querySelectorAll("[data-route]").forEach(el => {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        const route = el.getAttribute("data-route");
        navigateTo(route);
      });
    });

    // Logout action
    const logoutHandler = function (e) {
      if (e) e.preventDefault();
      window.AegisModal.confirm({
        title: "Confirm Secure Logout",
        message: "Are you sure you wish to terminate your current online banking session?",
        confirmText: "Sign Out",
        cancelText: "Stay Logged In",
        onConfirm: async function () {
          await window.AegisApi.logout();
          window.AegisToast.info("Session Ended", "You have been logged out securely.");
          navigateTo("login");
        }
      });
    };

    const logoutBtnSidebar = document.getElementById("btn-sidebar-logout");
    if (logoutBtnSidebar) logoutBtnSidebar.onclick = logoutHandler;
  }

  async function updateSidebarUser() {
    if (!window.AegisApi.isLoggedIn()) return;

    const res = await window.AegisApi.getAccountDetails();
    if (!res.success) return;

    const user = res.user;
    const account = res.account;

    const nameEl = document.getElementById("sidebar-user-name");
    const accEl = document.getElementById("sidebar-user-acc");
    const avatarEl = document.getElementById("sidebar-user-avatar");
    const topbarNameEl = document.getElementById("topbar-name-small");
    const topbarAvatarEl = document.getElementById("topbar-avatar-small");

    if (nameEl) nameEl.textContent = user.fullName;
    if (accEl) accEl.textContent = account.displayAccount;
    if (topbarNameEl) topbarNameEl.textContent = user.fullName.split(" ")[0];

    const initials = (user.fullName || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (avatarEl) avatarEl.textContent = initials;
    if (topbarAvatarEl) topbarAvatarEl.textContent = initials;
  }

  function setupClock() {
    const clockEl = document.getElementById("topbar-live-clock");
    if (!clockEl) return;

    function update() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }

    update();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(update, 1000);
  }

  function setupNotificationPopover() {
    const btn = document.getElementById("topbar-notification-btn");
    const popover = document.getElementById("topbar-notification-popover");
    if (!btn || !popover) return;

    btn.onclick = function (e) {
      e.stopPropagation();
      popover.classList.toggle("show");
    };

    document.addEventListener("click", function (e) {
      if (!popover.contains(e.target) && e.target !== btn) {
        popover.classList.remove("show");
      }
    });
  }

  function setupMobileSidebar() {
    const hamburger = document.getElementById("hamburger-menu-btn");
    const sidebar = document.getElementById("main-sidebar");

    if (hamburger && sidebar) {
      hamburger.onclick = function (e) {
        e.stopPropagation();
        sidebar.classList.toggle("mobile-open");
      };

      document.addEventListener("click", function (e) {
        if (sidebar.classList.contains("mobile-open") && !sidebar.contains(e.target) && e.target !== hamburger) {
          sidebar.classList.remove("mobile-open");
        }
      });
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById("main-sidebar");
    if (sidebar) sidebar.classList.remove("mobile-open");
  }

  return {
    init,
    navigateTo,
    updateSidebarUser
  };
})();

// Auto-boot once DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  window.AegisApp.init();
});
