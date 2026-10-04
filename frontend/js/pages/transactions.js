/**
 * REAL TRANSACTION HISTORY CONTROLLER
 * 
 * Fetches real transaction records directly from MySQL database.
 */

window.AegisTransactionsPage = (function () {
  let filterType = "ALL";
  let searchQuery = "";
  let sortOrder = "NEWEST";
  let allTransactions = [];
  let userAccountNumber = "";

  async function render() {
    setupControls();
    await loadTransactions();
  }

  function setupControls() {
    const searchInput = document.getElementById("txn-search-input");
    if (searchInput) {
      searchInput.oninput = function () {
        searchQuery = searchInput.value.trim().toLowerCase();
        applyFiltersAndRender();
      };
    }

    const pills = document.querySelectorAll(".filter-pill");
    pills.forEach(pill => {
      pill.onclick = function () {
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        filterType = pill.getAttribute("data-type");
        applyFiltersAndRender();
      };
    });

    const sortSelect = document.getElementById("txn-sort-select");
    if (sortSelect) {
      sortSelect.onchange = function () {
        sortOrder = sortSelect.value;
        applyFiltersAndRender();
      };
    }

    const exportBtn = document.getElementById("btn-export-statement");
    if (exportBtn) {
      exportBtn.onclick = function () {
        exportCsvStatement();
      };
    }
  }

  async function loadTransactions() {
    const tbody = document.getElementById("txn-table-body");
    const countEl = document.getElementById("txn-count-summary");
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">Loading transactions from MySQL database...</td></tr>`;

    const res = await window.AegisApi.getTransactions();
    if (!res.success) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: #fb7185;">Unable to load transactions from database.</td></tr>`;
      return;
    }

    allTransactions = res.transactions || [];
    userAccountNumber = res.accountNumber || "";
    applyFiltersAndRender();
  }

  function applyFiltersAndRender() {
    let list = [...allTransactions];

    // Type filter
    if (filterType !== "ALL") {
      list = list.filter(t => {
        if (filterType === "DEPOSIT") return t.transactionType === "DEPOSIT";
        if (filterType === "WITHDRAWAL") return t.transactionType === "WITHDRAWAL";
        if (filterType === "TRANSFER_SENT") return t.transactionType === "TRANSFER_SENT" && t.senderAccount === userAccountNumber;
        if (filterType === "TRANSFER_RECEIVED") return t.receiverAccount === userAccountNumber && t.transactionType !== "DEPOSIT";
        return true;
      });
    }

    // Search query
    if (searchQuery) {
      list = list.filter(t => 
        (t.transactionId && t.transactionId.toLowerCase().includes(searchQuery)) ||
        (t.description && t.description.toLowerCase().includes(searchQuery)) ||
        (t.senderName && t.senderName.toLowerCase().includes(searchQuery)) ||
        (t.receiverName && t.receiverName.toLowerCase().includes(searchQuery)) ||
        (t.senderAccount && t.senderAccount.includes(searchQuery)) ||
        (t.receiverAccount && t.receiverAccount.includes(searchQuery))
      );
    }

    // Sorting
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      const amtA = parseFloat(a.amount) || 0;
      const amtB = parseFloat(b.amount) || 0;

      if (sortOrder === "NEWEST") return timeB - timeA;
      if (sortOrder === "OLDEST") return timeA - timeB;
      if (sortOrder === "AMOUNT_HIGH") return amtB - amtA;
      if (sortOrder === "AMOUNT_LOW") return amtA - amtB;
      return 0;
    });

    renderTable(list);
  }

  function renderTable(txns) {
    const tbody = document.getElementById("txn-table-body");
    const countEl = document.getElementById("txn-count-summary");
    if (!tbody) return;

    if (countEl) {
      countEl.textContent = `Showing ${txns.length} database records`;
    }

    if (txns.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <div>No transactions match your current search or filter criteria.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = txns.map(t => {
      const isCredit = t.receiverAccount === userAccountNumber;
      const amountPrefix = isCredit ? "+ " : "- ";
      const formattedAmt = amountPrefix + window.AegisApi.formatCurrency(t.amount);

      let badgeClass = "badge-info";
      let typeLabel = t.transactionType;
      if (t.transactionType === "DEPOSIT") {
        badgeClass = "badge-success";
        typeLabel = "Deposit";
      } else if (t.transactionType === "WITHDRAWAL") {
        badgeClass = "badge-warning";
        typeLabel = "Withdrawal";
      } else if (t.transactionType === "TRANSFER_SENT" && !isCredit) {
        badgeClass = "badge-danger";
        typeLabel = "Transfer Sent";
      } else if (isCredit) {
        badgeClass = "badge-success";
        typeLabel = "Transfer Received";
      }

      return `
        <tr data-txn-id="${t.transactionId}" style="cursor: pointer;" title="Click to view official e-receipt">
          <td>
            <div class="txn-id-cell">
              <span>${t.transactionId}</span>
            </div>
          </td>
          <td>
            <div class="txn-date-cell">${window.AegisApi.formatDate(t.createdAt)}</div>
          </td>
          <td>
            <span class="badge ${badgeClass}">${typeLabel}</span>
          </td>
          <td>
            <div class="txn-party-name">${escapeHtml(t.senderName)}</div>
            <div class="txn-party-account">${t.senderAccount ? t.senderAccount.slice(-4) : "----"}</div>
          </td>
          <td>
            <div class="txn-party-name">${escapeHtml(t.receiverName)}</div>
            <div class="txn-party-account">${t.receiverAccount ? t.receiverAccount.slice(-4) : "----"}</div>
          </td>
          <td>
            <span class="table-amount ${isCredit ? 'credit' : 'debit'}">${formattedAmt}</span>
          </td>
          <td>
            <span class="badge badge-success badge-pill">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ${t.status || 'Success'}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("tr").forEach(row => {
      row.onclick = function () {
        const id = row.getAttribute("data-txn-id");
        const found = allTransactions.find(t => t.transactionId === id);
        if (found) window.AegisModal.showReceipt(found, userAccountNumber);
      };
    });
  }

  function exportCsvStatement() {
    if (!allTransactions || allTransactions.length === 0) {
      window.AegisToast.error("No Records", "No transaction records available to export.");
      return;
    }

    let csv = "Transaction ID,Date,Type,Sender,Receiver,Amount,Status,Description\n";
    allTransactions.forEach(t => {
      csv += `"${t.transactionId}","${t.createdAt}","${t.transactionType}","${t.senderName}","${t.receiverName}","${t.amount}","${t.status}","${t.description}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `AegisBank_Statement_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.AegisToast.success("Statement Downloaded", "Real database statement exported to CSV.");
  }

  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return {
    render
  };
})();
