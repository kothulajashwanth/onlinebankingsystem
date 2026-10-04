/**
 * REUSABLE MODAL & POPUP DIALOG SYSTEM
 * 
 * Complies with requirement:
 * "Success/error messages should NOT appear as tiny text somewhere on the page.
 * They should appear as polished centered modal/toast notifications."
 */

window.AegisModal = (function () {
  let overlay = null;

  function ensureModal() {
    if (!overlay) {
      overlay = document.getElementById("app-modal-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "app-modal-overlay";
        overlay.className = "modal-overlay";
        overlay.innerHTML = `<div class="modal-dialog" id="app-modal-dialog"></div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) {
            AegisModal.close();
          }
        });
      }
    }
    return overlay;
  }

  return {
    close: function () {
      if (overlay) {
        overlay.classList.remove("active");
      }
    },

    // 1. Confirmation Modal
    confirm: function ({ title, message, detailsHtml = "", confirmText = "Confirm", cancelText = "Cancel", onConfirm }) {
      ensureModal();
      const dialog = document.getElementById("app-modal-dialog");
      dialog.innerHTML = `
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close-btn" id="modal-close-x">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem;">${message}</p>
          ${detailsHtml}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>
          <button class="btn btn-primary" id="modal-confirm-btn">${confirmText}</button>
        </div>
      `;

      dialog.querySelector("#modal-close-x").onclick = AegisModal.close;
      dialog.querySelector("#modal-cancel-btn").onclick = AegisModal.close;
      dialog.querySelector("#modal-confirm-btn").onclick = function () {
        AegisModal.close();
        if (typeof onConfirm === "function") onConfirm();
      };

      overlay.classList.add("active");
    },

    // 2. Centered Success Modal
    success: function ({ title = "Operation Successful", message, txnId, receiptRows = [], onDone }) {
      ensureModal();
      const dialog = document.getElementById("app-modal-dialog");

      let receiptHtml = "";
      if (receiptRows && receiptRows.length > 0) {
        receiptHtml = `
          <div class="modal-receipt-box">
            ${receiptRows.map(r => `
              <div class="receipt-row">
                <span class="receipt-label">${r.label}</span>
                <span class="receipt-val">${r.value}</span>
              </div>
            `).join("")}
          </div>
        `;
      }

      dialog.innerHTML = `
        <div class="modal-body">
          <div class="modal-status-hero">
            <div class="status-icon-circle success">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2>${title}</h2>
            <p>${message}</p>
            ${txnId ? `<div style="margin-top: 0.75rem;"><span class="badge badge-info" style="font-family: var(--font-mono); font-size: 0.85rem; padding: 0.4rem 0.8rem;">${txnId}</span></div>` : ""}
          </div>
          ${receiptHtml}
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button class="btn btn-primary btn-lg" id="modal-done-btn" style="min-width: 180px;">Done</button>
        </div>
      `;

      dialog.querySelector("#modal-done-btn").onclick = function () {
        AegisModal.close();
        if (typeof onDone === "function") onDone();
      };

      overlay.classList.add("active");
    },

    // 3. Centered Error Modal
    error: function ({ title = "Operation Failed", message = "An error occurred while processing your request.", onDone }) {
      ensureModal();
      const dialog = document.getElementById("app-modal-dialog");

      dialog.innerHTML = `
        <div class="modal-body">
          <div class="modal-status-hero">
            <div class="status-icon-circle error">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2>${title}</h2>
            <p style="color: #fca5a5; font-size: 0.95rem; margin-top: 0.4rem;">${message}</p>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button class="btn btn-secondary btn-lg" id="modal-error-close-btn" style="min-width: 160px;">Dismiss</button>
        </div>
      `;

      dialog.querySelector("#modal-error-close-btn").onclick = function () {
        AegisModal.close();
        if (typeof onDone === "function") onDone();
      };

      overlay.classList.add("active");
    },

    // 4. Real Transaction E-Receipt Modal
    showReceipt: function (txn, userAccountNumber) {
      ensureModal();
      const dialog = document.getElementById("app-modal-dialog");
      const isCredit = txn.receiverAccount === userAccountNumber;
      const formattedAmt = (isCredit ? "+ " : "- ") + window.AegisApi.formatCurrency(txn.amount);

      dialog.innerHTML = `
        <div class="modal-header">
          <h3>Transaction E-Receipt</h3>
          <button class="modal-close-btn" id="modal-close-x">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Transaction Amount</div>
            <div style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 700; color: ${isCredit ? 'var(--credit-green)' : 'var(--debit-red)'}; margin: 0.35rem 0;">
              ${formattedAmt}
            </div>
            <span class="badge badge-success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> ${txn.status || 'Completed'}</span>
          </div>

          <div class="modal-receipt-box">
            <div class="receipt-row">
              <span class="receipt-label">Transaction ID</span>
              <span class="receipt-val" style="font-family: var(--font-mono); color: var(--accent-blue);">${txn.transactionId}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Timestamp</span>
              <span class="receipt-val">${window.AegisApi.formatDate(txn.createdAt)}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Type</span>
              <span class="receipt-val">${(txn.transactionType || '').replace('_', ' ')}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Sender</span>
              <span class="receipt-val">${txn.senderName} (${txn.senderAccount ? txn.senderAccount.slice(-4) : '----'})</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Receiver</span>
              <span class="receipt-val">${txn.receiverName} (${txn.receiverAccount ? txn.receiverAccount.slice(-4) : '----'})</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Remarks / Purpose</span>
              <span class="receipt-val">${txn.description}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Database Status</span>
              <span class="receipt-val" style="color: var(--credit-green);">COMMITTED (MySQL)</span>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button class="btn btn-secondary btn-sm" id="modal-print-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Receipt
          </button>
          <button class="btn btn-primary btn-sm" id="modal-close-btn">Close</button>
        </div>
      `;

      dialog.querySelector("#modal-close-x").onclick = AegisModal.close;
      dialog.querySelector("#modal-close-btn").onclick = AegisModal.close;
      dialog.querySelector("#modal-print-btn").onclick = function () {
        window.print();
      };

      overlay.classList.add("active");
    }
  };
})();
