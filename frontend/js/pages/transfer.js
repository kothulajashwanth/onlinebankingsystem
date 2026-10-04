/**
 * REAL FUND TRANSFER CONTROLLER
 * 
 * Verifies recipient against MySQL and coordinates real atomic database fund transfers.
 */

window.AegisTransferPage = (function () {
  let currentStep = 1;
  let transferData = {
    receiverAccount: "",
    receiverName: "",
    amount: 0,
    description: "College expenses"
  };
  let cachedUser = null;
  let cachedAccount = null;

  async function render() {
    currentStep = 1;
    updateStepUI();

    const acctRes = await window.AegisApi.getAccountDetails();
    if (!acctRes.success) {
      window.AegisToast.error("Session Error", "Please sign in to transfer funds.");
      window.AegisApp.navigateTo("login");
      return;
    }

    cachedUser = acctRes.user;
    cachedAccount = acctRes.account;

    const balanceEl = document.getElementById("transfer-current-balance");
    const accPillEl = document.getElementById("transfer-acc-pill");
    if (balanceEl) balanceEl.textContent = window.AegisApi.formatCurrency(cachedAccount.balance);
    if (accPillEl) accPillEl.textContent = `${cachedAccount.accountType} • ${cachedAccount.displayAccount}`;

    // Receiver Account Input & Real Database Lookup
    const receiverInput = document.getElementById("transfer-receiver-input");
    const payeePreview = document.getElementById("transfer-payee-preview");
    const payeeNameEl = document.getElementById("transfer-payee-name");
    const payeeBankEl = document.getElementById("transfer-payee-bank");

    let lookupTimer = null;
    if (receiverInput) {
      receiverInput.oninput = function () {
        clearTimeout(lookupTimer);
        const val = receiverInput.value.trim();
        if (val.length >= 8) {
          lookupTimer = setTimeout(async () => {
            const res = await window.AegisApi.lookupReceiver(val);
            if (res.success) {
              transferData.receiverAccount = res.accountNumber;
              transferData.receiverName = res.receiverName;
              if (payeePreview) payeePreview.style.display = "flex";
              if (payeeNameEl) payeeNameEl.textContent = res.receiverName;
              if (payeeBankEl) payeeBankEl.textContent = `${res.bankName} • ${res.branch}`;
            } else {
              if (payeePreview) payeePreview.style.display = "none";
            }
          }, 350);
        } else {
          if (payeePreview) payeePreview.style.display = "none";
        }
      };
    }

    // Step 2 Amount Input & Chips
    const amountInput = document.getElementById("transfer-amount-input");
    const chips = document.querySelectorAll(".preset-transfer-chip");
    chips.forEach(chip => {
      chip.onclick = function () {
        const v = chip.getAttribute("data-val");
        if (amountInput) amountInput.value = v;
      };
    });

    // Step 1 -> Next
    const step1Next = document.getElementById("step-1-next");
    if (step1Next) {
      step1Next.onclick = async function () {
        const val = receiverInput ? receiverInput.value.trim() : "";
        if (!val || val.length < 8) {
          window.AegisToast.error("Invalid Account", "Please enter a valid receiver account number (min 8 digits).");
          return;
        }
        if (val === cachedAccount.accountNumber) {
          window.AegisToast.error("Self Transfer Restricted", "You cannot transfer funds to your own account from this screen. Use Deposit instead.");
          return;
        }

        // Verify receiver in MySQL
        step1Next.disabled = true;
        step1Next.innerHTML = `<span>Verifying...</span>`;
        const res = await window.AegisApi.lookupReceiver(val);
        step1Next.disabled = false;
        step1Next.innerHTML = `<span>Continue to Amount</span>`;

        if (!res.success) {
          window.AegisToast.error("Account Not Found", res.message || "Receiver account does not exist in the database.");
          return;
        }

        transferData.receiverAccount = res.accountNumber;
        transferData.receiverName = res.receiverName;

        currentStep = 2;
        updateStepUI();
      };
    }

    // Step 2 -> Prev / Next
    const step2Prev = document.getElementById("step-2-prev");
    const step2Next = document.getElementById("step-2-next");
    if (step2Prev) step2Prev.onclick = () => { currentStep = 1; updateStepUI(); };
    if (step2Next) {
      step2Next.onclick = function () {
        const amt = parseFloat(amountInput ? amountInput.value : 0);
        if (!amt || isNaN(amt) || amt <= 0) {
          window.AegisToast.error("Amount Required", "Please enter a transfer amount greater than ₹0.");
          return;
        }
        const senderBal = parseFloat(cachedAccount.balance) || 0;
        if (amt > senderBal) {
          window.AegisToast.error("Insufficient Funds", `Your available balance is ${window.AegisApi.formatCurrency(senderBal)}. Transfer of ${window.AegisApi.formatCurrency(amt)} exceeds balance.`);
          return;
        }

        transferData.amount = amt;
        currentStep = 3;
        updateStepUI();
      };
    }

    // Step 3 -> Prev / Next
    const descInput = document.getElementById("transfer-desc-input");
    const step3Prev = document.getElementById("step-3-prev");
    const step3Next = document.getElementById("step-3-next");
    if (step3Prev) step3Prev.onclick = () => { currentStep = 2; updateStepUI(); };
    if (step3Next) {
      step3Next.onclick = function () {
        const d = descInput ? descInput.value.trim() : "";
        transferData.description = d || "Fund Transfer";
        currentStep = 4;
        updateStepUI();
        populateReview();
      };
    }

    // Step 4 -> Prev / Final Submit
    const step4Prev = document.getElementById("step-4-prev");
    const step4Confirm = document.getElementById("step-4-confirm-btn");
    if (step4Prev) step4Prev.onclick = () => { currentStep = 3; updateStepUI(); };

    if (step4Confirm) {
      step4Confirm.onclick = function () {
        const formattedAmt = window.AegisApi.formatCurrency(transferData.amount);

        // Required Confirmation Dialog
        window.AegisModal.confirm({
          title: "Authorize Fund Transfer",
          message: `Are you sure you want to transfer ${formattedAmt} to ${transferData.receiverName}?`,
          detailsHtml: `
            <div class="modal-receipt-box">
              <div class="receipt-row"><span class="receipt-label">Transfer Amount:</span><span class="receipt-val" style="color: var(--accent-blue);">${formattedAmt}</span></div>
              <div class="receipt-row"><span class="receipt-label">Beneficiary:</span><span class="receipt-val">${escapeHtml(transferData.receiverName)}</span></div>
              <div class="receipt-row"><span class="receipt-label">Destination Account:</span><span class="receipt-val">${transferData.receiverAccount}</span></div>
              <div class="receipt-row"><span class="receipt-label">Purpose:</span><span class="receipt-val">${escapeHtml(transferData.description)}</span></div>
            </div>
          `,
          confirmText: "Confirm Transfer",
          cancelText: "Cancel",
          onConfirm: async function () {
            if (step4Confirm) {
              step4Confirm.disabled = true;
              step4Confirm.innerHTML = `<span>Processing Atomic Transfer in MySQL...</span>`;
            }

            // Real backend atomic transfer call
            const res = await window.AegisApi.transfer(
              transferData.receiverAccount,
              transferData.amount,
              transferData.description
            );

            if (step4Confirm) {
              step4Confirm.disabled = false;
              step4Confirm.innerHTML = `<span>Confirm Transfer</span>`;
            }

            if (res.success) {
              window.AegisModal.success({
                title: "Transfer Successful",
                message: `${formattedAmt} has been transferred successfully to ${transferData.receiverName}.`,
                txnId: "Transaction ID: " + res.transactionId,
                receiptRows: [
                  { label: "From Account", value: cachedAccount.accountNumber },
                  { label: "To Beneficiary", value: transferData.receiverName + " (" + transferData.receiverAccount.slice(-4) + ")" },
                  { label: "Transfer Sum", value: formattedAmt },
                  { label: "Remaining Balance", value: window.AegisApi.formatCurrency(res.updatedBalance) },
                  { label: "Transaction Integrity", value: "COMMITTED ATOMICALLY" }
                ],
                onDone: function () {
                  if (receiverInput) receiverInput.value = "";
                  if (amountInput) amountInput.value = "";
                  if (descInput) descInput.value = "";
                  currentStep = 1;
                  updateStepUI();
                  window.AegisApp.navigateTo("dashboard");
                }
              });
            } else {
              window.AegisModal.error({
                title: "Transfer Failed",
                message: res.message || "Insufficient balance or invalid transfer parameters."
              });
              window.AegisToast.error("Transfer Failed", res.message || "Unable to complete fund transfer.");
            }
          }
        });
      };
    }
  }

  function updateStepUI() {
    const nodes = document.querySelectorAll(".step-node");
    nodes.forEach(node => {
      const stepNum = parseInt(node.getAttribute("data-step"));
      node.classList.remove("active", "completed");
      if (stepNum === currentStep) {
        node.classList.add("active");
      } else if (stepNum < currentStep) {
        node.classList.add("completed");
      }
    });

    const panels = document.querySelectorAll(".transfer-step-panel");
    panels.forEach(p => {
      const s = parseInt(p.getAttribute("data-step-panel"));
      if (s === currentStep) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });
  }

  function populateReview() {
    const formattedAmt = window.AegisApi.formatCurrency(transferData.amount);

    const revFromEl = document.getElementById("rev-from-user");
    const revToEl = document.getElementById("rev-to-receiver");
    const revAmtEl = document.getElementById("rev-amount-val");
    const revDescEl = document.getElementById("rev-desc-val");
    const revCalloutEl = document.getElementById("rev-callout-amt");

    if (revFromEl) revFromEl.textContent = `${cachedUser.fullName} (${cachedAccount.displayAccount})`;
    if (revToEl) revToEl.textContent = `${transferData.receiverName} (•••• ${transferData.receiverAccount.slice(-4)})`;
    if (revAmtEl) revAmtEl.textContent = formattedAmt;
    if (revCalloutEl) revCalloutEl.textContent = formattedAmt;
    if (revDescEl) revDescEl.textContent = transferData.description;
  }

  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return {
    render
  };
})();
