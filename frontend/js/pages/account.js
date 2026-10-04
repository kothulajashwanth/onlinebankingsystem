/**
 * REAL MY ACCOUNT DETAILS PAGE CONTROLLER
 * 
 * Fetches real account records directly from MySQL via AegisApi.
 */

window.AegisAccountPage = (function () {
  async function render() {
    const res = await window.AegisApi.getAccountDetails();
    if (!res.success) {
      window.AegisToast.error("Session Error", "Please sign in to view account details.");
      window.AegisApp.navigateTo("login");
      return;
    }

    const user = res.user;
    const account = res.account;

    // Populate Hero Summary
    const heroName = document.getElementById("acct-hero-name");
    const heroAccType = document.getElementById("acct-hero-type");
    const heroBalance = document.getElementById("acct-hero-balance");
    const heroStatus = document.getElementById("acct-hero-status");
    const heroAvatar = document.getElementById("acct-hero-avatar");

    if (heroName) heroName.textContent = user.fullName;
    if (heroAccType) heroAccType.textContent = `${account.accountType} Account`;
    if (heroBalance) heroBalance.textContent = window.AegisApi.formatCurrency(account.balance);
    if (heroStatus) heroStatus.textContent = account.status;
    if (heroAvatar) {
      const initials = (user.fullName || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      heroAvatar.textContent = initials;
    }

    // Populate Detailed Fields from Real Database
    const fieldMap = {
      "acct-field-fullname": user.fullName,
      "acct-field-accnumber": account.accountNumber,
      "acct-field-acctype": `${account.accountType} Account`,
      "acct-field-accstatus": account.status,
      "acct-field-email": user.email,
      "acct-field-phone": user.phone,
      "acct-field-dob": user.dob,
      "acct-field-address": user.address,
      "acct-field-balance": window.AegisApi.formatCurrency(account.balance),
      "acct-field-ifsc": account.ifsc,
      "acct-field-branch": account.branch
    };

    for (let id in fieldMap) {
      const el = document.getElementById(id);
      if (el) el.textContent = fieldMap[id] || "—";
    }

    // "Edit Profile" Button
    const editBtn = document.getElementById("btn-goto-edit-profile");
    if (editBtn) {
      editBtn.onclick = function () {
        window.AegisApp.navigateTo("profile");
      };
    }
  }

  return {
    render
  };
})();
