/**
 * REAL DEPOSIT MONEY CONTROLLER
 * 
 * Performs real deposit persistence to MySQL via Java backend.
 */

window.AegisDepositPage = (function () {
  async function render() {
    const acctRes = await window.AegisApi.getAccountDetails();
    if (!acctRes.success) {
      window.AegisToast.error("Session Error", "Please log in to make a deposit.");
      window.AegisApp.navigateTo("login");
      return;
    }

    const account = acctRes.account;
    const balanceEl = document.getElementById("deposit-current-balance");
    const accountPillEl = document.getElementById("deposit-acc-pill");
    const form = document.getElementById("deposit-form");
    const amountInput = document.getElementById("deposit-amount");
    const descInput = document.getElementById("deposit-description");
    const submitBtn = document.getElementById("deposit-submit-btn");

    if (balanceEl) balanceEl.textContent = window.AegisApi.formatCurrency(account.balance);
    if (accountPillEl) accountPillEl.textContent = `${account.accountType} • ${account.displayAccount}`;

    // Setup Preset Chips
    const chips = document.querySelectorAll(".preset-deposit-chip");
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
        const desc = (descInput && descInput.value.trim()) ? descInput.value.trim() : "Self Cash Deposit";

        if (!amt || isNaN(amt) || amt <= 0) {
          window.AegisToast.error("Invalid Amount", "Please enter a valid deposit amount greater than ₹0.");
          return;
        }

        const formattedAmt = window.AegisApi.formatCurrency(amt);

        // Confirmation Modal
        window.AegisModal.confirm({
          title: "Confirm Deposit Transaction",
          message: `You are about to deposit ${formattedAmt} into your account (${account.displayAccount}).`,
          detailsHtml: `
            <div class="modal-receipt-box">
              <div class="receipt-row"><span class="receipt-label">Deposit Amount:</span><span class="receipt-val" style="color: var(--credit-green);">${formattedAmt}</span></div>
              <div class="receipt-row"><span class="receipt-label">Target Account:</span><span class="receipt-val">${account.accountNumber}</span></div>
              <div class="receipt-row"><span class="receipt-label">Channel:</span><span class="receipt-val">Digital Bank Deposit / Cash CDM</span></div>
              <div class="receipt-row"><span class="receipt-label">Remarks:</span><span class="receipt-val">${escapeHtml(desc)}</span></div>
            </div>
          `,
          confirmText: "Proceed with Deposit",
          cancelText: "Cancel",
          onConfirm: async function () {
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = `<span>Processing Deposit in Database...</span>`;
            }

            // Real backend deposit call
            const res = await window.AegisApi.deposit(amt, desc);

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<span>Proceed to Deposit</span>`;
            }

            if (res.success) {
              // Centered success popup with real transaction ID
              window.AegisModal.success({
                title: "Deposit Successful",
                message: `${formattedAmt} has been deposited and committed to your MySQL balance.`,
                txnId: res.transactionId,
                receiptRows: [
                  { label: "Account Credited", value: account.accountNumber },
                  { label: "Amount Deposited", value: formattedAmt },
                  { label: "Updated Balance", value: window.AegisApi.formatCurrency(res.updatedBalance) },
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
                title: "Deposit Failed",
                message: res.message || "Failed to process deposit."
              });
              window.AegisToast.error("Deposit Failed", res.message || "Failed to process deposit.");
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
