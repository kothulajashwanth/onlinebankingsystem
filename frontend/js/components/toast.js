/**
 * REUSABLE TOAST NOTIFICATION SYSTEM
 * 
 * Features:
 * - Glassmorphism floating cards
 * - Types: SUCCESS, ERROR, INFO, WARNING
 * - Auto-dismiss with smooth slide animation
 * - Close button
 */

window.AegisToast = (function () {
  let container = null;

  function ensureContainer() {
    if (!container) {
      container = document.getElementById("toast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function getIcon(type) {
    switch (type) {
      case "success":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      case "error":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      case "warning":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      default: // info
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
  }

  return {
    show: function (type, title, message, duration = 4200) {
      const parent = ensureContainer();

      const toast = document.createElement("div");
      toast.className = `toast-item toast-${type}`;
      toast.innerHTML = `
        <div class="toast-icon">${getIcon(type)}</div>
        <div class="toast-body">
          <div class="toast-title">${title}</div>
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;

      parent.appendChild(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add("show");
      });

      const closeBtn = toast.querySelector(".toast-close");
      const dismiss = () => {
        toast.classList.remove("show");
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      };

      closeBtn.addEventListener("click", dismiss);

      if (duration > 0) {
        setTimeout(dismiss, duration);
      }
    },

    success: function (title, message) {
      this.show("success", title, message);
    },

    error: function (title, message) {
      this.show("error", title, message);
    },

    info: function (title, message) {
      this.show("info", title, message);
    },

    warning: function (title, message) {
      this.show("warning", title, message);
    }
  };
})();
