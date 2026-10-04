/**
 * REAL DASHBOARD PAGE CONTROLLER
 * 
 * Fetches real user account data and real transaction history directly from MySQL.
 */

window.AegisDashboardPage = (function () {
  let isBalanceMasked = false;
  let cachedAccount = null;

  async function render() {
    const res = await window.AegisApi.getAccountDetails();
    if (!res.success) {
      window.AegisToast.error("Session Expired", "Please log in to view your dashboard.");
      window.AegisApp.navigateTo("login");
      return;
    }

    const user = res.user;
    const account = res.account;
    cachedAccount = account;

    // 1. Dynamic Greeting Header
    const welcomeNameEl = document.getElementById("dash-welcome-name");
    const greetingTimeEl = document.getElementById("dash-greeting-time");
    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";

    if (greetingTimeEl) greetingTimeEl.textContent = greeting;
    if (welcomeNameEl) {
      welcomeNameEl.textContent = user.fullName || "Customer";
    }

    // 2. Balance & Card
    updateBalanceDisplay(account.balance);

    const cardHolderEl = document.getElementById("dash-card-holder");
    if (cardHolderEl) cardHolderEl.textContent = user.fullName;

    const cardAccNumEl = document.getElementById("dash-card-acc-num");
    if (cardAccNumEl) cardAccNumEl.textContent = account.displayAccount;

    const cardTypeEl = document.getElementById("dash-card-type");
    if (cardTypeEl) cardTypeEl.textContent = `${account.accountType} Account`;

    const cardStatusEl = document.getElementById("dash-card-status");
    if (cardStatusEl) cardStatusEl.textContent = account.status || "Active";

    // Toggle balance mask
    const toggleBalBtn = document.getElementById("btn-toggle-dash-balance");
    if (toggleBalBtn) {
      toggleBalBtn.onclick = function () {
        isBalanceMasked = !isBalanceMasked;
        updateBalanceDisplay(cachedAccount.balance);
      };
    }

    // Copy Account Number
    const copyAccBtn = document.getElementById("btn-copy-dash-acc");
    if (copyAccBtn) {
      copyAccBtn.onclick = function () {
        navigator.clipboard.writeText(account.accountNumber).then(() => {
          window.AegisToast.success("Copied to Clipboard", `Account number ${account.accountNumber} copied.`);
        }).catch(() => {
          window.AegisToast.info("Account Number", account.accountNumber);
        });
      };
    }

    // 3. Quick Actions routes
    setupQuickActions();

    // 4. Fetch Real Recent Transactions from MySQL
    loadRecentTransactions();
  }

  function updateBalanceDisplay(rawBalance) {
    const balanceEl = document.getElementById("dash-card-balance");
    const toggleIcon = document.getElementById("toggle-balance-icon");
    if (!balanceEl) return;

    if (isBalanceMasked) {
      balanceEl.textContent = "₹ ••••••••";
      if (toggleIcon) {
        toggleIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      }
    } else {
      balanceEl.textContent = window.AegisApi.formatCurrency(rawBalance);
      if (toggleIcon) {
        toggleIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    }
  }

  function setupQuickActions() {
    const actDeposit = document.getElementById("action-go-deposit");
    const actWithdraw = document.getElementById("action-go-withdraw");
    const actTransfer = document.getElementById("action-go-transfer");
    const actHistory = document.getElementById("action-go-history");

    if (actDeposit) actDeposit.onclick = () => window.AegisApp.navigateTo("deposit");
    if (actWithdraw) actWithdraw.onclick = () => window.AegisApp.navigateTo("withdraw");
    if (actTransfer) actTransfer.onclick = () => window.AegisApp.navigateTo("transfer");
    if (actHistory) actHistory.onclick = () => window.AegisApp.navigateTo("transactions");
  }

  async function loadRecentTransactions() {
    const listEl = document.getElementById("dash-recent-txns-list");
    const statCredits = document.getElementById("dash-stat-credits");
    const statDebits = document.getElementById("dash-stat-debits");

    try {
      const res = await window.AegisApi.getTransactions();
      if (!res.success || !res.transactions || res.transactions.length === 0) {
        if (listEl) {
          listEl.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h4>No Transactions Yet</h4>
              <p>Your deposit and fund transfer records will appear here as soon as you initiate transactions.</p>
            </div>
          `;
        }
        if (statCredits) statCredits.textContent = "₹0.00";
        if (statDebits) statDebits.textContent = "₹0.00";
        return;
      }

      let totalCredits = 0;
      let totalDebits = 0;
      const myAcc = res.accountNumber;

      res.transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        const isCredit = t.receiverAccount === myAcc;
        if (isCredit) totalCredits += amt;
        else totalDebits += amt;
      });

      if (statCredits) statCredits.textContent = window.AegisApi.formatCurrency(totalCredits);
      if (statDebits) statDebits.textContent = window.AegisApi.formatCurrency(totalDebits);

      const recentFive = res.transactions.slice(0, 5);

      if (listEl) {
        listEl.innerHTML = recentFive.map(t => {
          const isCredit = t.receiverAccount === myAcc;
          const iconBg = isCredit ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)";
          const iconColor = isCredit ? "var(--credit-green)" : "var(--debit-red)";
          const amountPrefix = isCredit ? "+ " : "- ";
          const formattedAmt = amountPrefix + window.AegisApi.formatCurrency(t.amount);

          return `
            <div class="txn-row" data-txn-id="${t.transactionId}" style="cursor: pointer;">
              <div class="txn-left">
                <div class="txn-type-avatar" style="background: ${iconBg}; color: ${iconColor};">
                  ${isCredit 
                    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>` 
                    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`}
                </div>
                <div>
                  <div class="txn-title">${escapeHtml(t.description)}</div>
                  <div class="txn-subtitle">${window.AegisApi.formatDate(t.createdAt)} • ${isCredit ? 'From: ' + escapeHtml(t.senderName) : 'To: ' + escapeHtml(t.receiverName)}</div>
                </div>
              </div>
              <div class="txn-right">
                <div class="txn-amount ${isCredit ? 'credit' : 'debit'}">${formattedAmt}</div>
                <span class="badge badge-success badge-pill" style="font-size: 0.7rem; padding: 0.15rem 0.5rem;">${t.status}</span>
              </div>
            </div>
          `;
        }).join("");

        // Attach click handler for receipt modal
        listEl.querySelectorAll(".txn-row").forEach(row => {
          row.onclick = function () {
            const id = row.getAttribute("data-txn-id");
            const txn = res.transactions.find(t => t.transactionId === id);
            if (txn) window.AegisModal.showReceipt(txn, myAcc);
          };
        });
      }
    } catch (e) {
      if (listEl) listEl.innerHTML = `<div class="transactions-list-empty">Unable to load transactions.</div>`;
    }
  }

  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return {
    render
  };
})();
