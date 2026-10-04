/**
 * REAL WITHDRAW MONEY CONTROLLER
 * 
 * Verifies balance against MySQL and processes real withdrawal via Java backend.
 */

window.AegisWithdrawPage = (function () {
  async function render() {
    const acctRes = await window.AegisApi.getAccountDetails();
    if (!acctRes.success) {
      window.AegisToast.error("Session Error", "Please sign in to withdraw funds.");
      window.AegisApp.navigateTo("login");
      return;
    }

    const account = acctRes.account;
    const balanceEl = document.getElementById("withdraw-current-balance");
    const accountPillEl = document.getElementById("withdraw-acc-pill");
    const form = document.getElementById("withdraw-form");
    const amountInput = document.getElementById("withdraw-amount");
    const descInput = document.getElementById("withdraw-description");
    const submitBtn = document.getElementById("withdraw-submit-btn");

    if (balanceEl) balanceEl.textContent = window.AegisApi.formatCurrency(account.balance);
    if (accountPillEl) accountPillEl.textContent = `${account.accountType} • ${account.displayAccount}`;

    // Setup Preset Chips
    const chips = document.querySelectorAll(".preset-withdraw-chip");
    chips.forEach(chip => {
      chip.onclick = function () {
        const val = chip.getAttribute("data-val");
        if (amountInput) amountInput.value = val;
      };
    });

    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        const amt = parseFloat(amountInput ? amountInput.value : 0);
        const desc = (descInput && descInput.value.trim()) ? descInput.value.trim() : "ATM Cash Withdrawal";

        if (!amountInput || !amountInput.value.trim()) {
          window.AegisToast.error("Amount Required", "Please enter the amount you wish to withdraw.");
          amountInput.focus();
          return;
        }

        if (isNaN(amt) || amt <= 0) {
          window.AegisToast.error("Invalid Amount", "Withdrawal amount must be greater than ₹0.");
          amountInput.focus();
          return;
        }

        const currentBal = parseFloat(account.balance) || 0;
        if (amt > currentBal) {
          window.AegisToast.error("Insufficient Balance", `Your current available balance is ${window.AegisApi.formatCurrency(currentBal)}. You cannot withdraw ${window.AegisApi.formatCurrency(amt)}.`);
          return;
        }

        const formattedAmt = window.AegisApi.formatCurrency(amt);

        // Confirmation Modal
        window.AegisModal.confirm({
          title: "Confirm Cash Withdrawal",
          message: `Are you sure you want to withdraw ${formattedAmt} from account ${account.displayAccount}?`,
          detailsHtml: `
            <div class="modal-receipt-box">
              <div class="receipt-row"><span class="receipt-label">Withdrawal Amount:</span><span class="receipt-val" style="color: var(--debit-red);">${formattedAmt}</span></div>
              <div class="receipt-row"><span class="receipt-label">Source Account:</span><span class="receipt-val">${account.accountNumber}</span></div>
              <div class="receipt-row"><span class="receipt-label">Projected Balance:</span><span class="receipt-val">${window.AegisApi.formatCurrency(currentBal - amt)}</span></div>
              <div class="receipt-row"><span class="receipt-label">Purpose:</span><span class="receipt-val">${escapeHtml(desc)}</span></div>
            </div>
          `,
          confirmText: "Confirm Withdrawal",
          cancelText: "Cancel",
          onConfirm: async function () {
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = `<span>Processing Withdrawal in Database...</span>`;
            }

            // Real backend withdrawal call
            const res = await window.AegisApi.withdraw(amt, desc);

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<span>Proceed to Withdraw</span>`;
            }

            if (res.success) {
              window.AegisModal.success({
                title: "Withdrawal Successful",
                message: `${formattedAmt} has been debited and dispensed successfully.`,
                txnId: res.transactionId,
                receiptRows: [
                  { label: "Account Debited", value: account.accountNumber },
                  { label: "Amount Withdrawn", value: formattedAmt },
                  { label: "Remaining Balance", value: window.AegisApi.formatCurrency(res.updatedBalance) },
                  { label: "Database Status", value: "COMMITTED" }
                ],
                onDone: function () {
                  if (amountInput) amountInput.value = "";
                  if (descInput) descInput.value = "";
                  window.AegisApp.navigateTo("dashboard");
                }
              });
            } else {
              window.AegisModal.error({
                title: "Withdrawal Failed",
                message: res.message || "Insufficient balance or invalid withdrawal amount."
              });
              window.AegisToast.error("Withdrawal Failed", res.message || "Failed to process withdrawal.");
            }
          }
        });
      };
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
