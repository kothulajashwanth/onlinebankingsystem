/**
 * REAL AUTHENTICATION CONTROLLER (LOGIN & REGISTER)
 * 
 * Uses real backend authentication via AegisApi against MySQL database.
 */

window.AegisAuthPage = (function () {
  let selectedAccountType = "Savings";

  function initLogin() {
    const loginForm = document.getElementById("login-form");
    if (!loginForm) return;

    // Password visibility toggle
    const togglePassBtn = document.getElementById("toggle-login-pass");
    const passInput = document.getElementById("login-password");
    if (togglePassBtn && passInput) {
      togglePassBtn.onclick = function () {
        const isPass = passInput.type === "password";
        passInput.type = isPass ? "text" : "password";
        togglePassBtn.innerHTML = isPass
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      };
    }

    // Real Login Form Submit
    loginForm.onsubmit = async function (e) {
      e.preventDefault();
      const usernameInput = document.getElementById("login-username");
      const passwordInput = document.getElementById("login-password");
      const submitBtn = document.getElementById("login-submit-btn");

      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!username || !password) {
        window.AegisToast.error("Missing Credentials", "Please enter both username and password.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="spin-animation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
        Authenticating...
      `;

      try {
        const res = await window.AegisApi.login(username, password);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>Sign In Securely</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;

        if (res.success) {
          window.AegisToast.success("Authentication Verified", `Welcome back, ${res.user.fullName}!`);
          window.AegisApp.navigateTo("dashboard");
        } else {
          window.AegisToast.error("Authentication Failed", res.message || "Invalid username or password.");
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In Securely</span>`;
        window.AegisToast.error("Connection Error", "Could not connect to banking server.");
      }
    };
  }

  function initRegister() {
    const regForm = document.getElementById("register-form");
    if (!regForm) return;

    // Account type cards
    const typeCards = document.querySelectorAll(".type-option-card");
    typeCards.forEach(card => {
      card.onclick = function () {
        typeCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedAccountType = card.getAttribute("data-type") || "Savings";
      };
    });

    // Real-time password strength meter
    const pwdInput = document.getElementById("reg-password");
    const strengthContainer = document.getElementById("reg-pwd-strength-container");
    const bar1 = document.getElementById("pwd-bar-1");
    const bar2 = document.getElementById("pwd-bar-2");
    const bar3 = document.getElementById("pwd-bar-3");
    const bar4 = document.getElementById("pwd-bar-4");
    const strengthText = document.getElementById("pwd-strength-text");

    if (pwdInput && strengthContainer) {
      pwdInput.oninput = function () {
        const val = pwdInput.value;
        if (!val) {
          strengthContainer.style.display = "none";
          return;
        }
        strengthContainer.style.display = "block";

        let score = 0;
        if (val.length >= 6) score++;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        const resetBars = () => {
          [bar1, bar2, bar3, bar4].forEach(b => {
            if (b) b.style.background = "rgba(255, 255, 255, 0.1)";
          });
        };
        resetBars();

        if (score <= 1) {
          if (bar1) bar1.style.background = "var(--debit-red)";
          if (strengthText) { strengthText.textContent = "Weak"; strengthText.style.color = "var(--debit-red)"; }
        } else if (score === 2) {
          if (bar1) bar1.style.background = "var(--warning-amber)";
          if (bar2) bar2.style.background = "var(--warning-amber)";
          if (strengthText) { strengthText.textContent = "Fair"; strengthText.style.color = "var(--warning-amber)"; }
        } else if (score === 3) {
          if (bar1) bar1.style.background = "var(--accent-blue)";
          if (bar2) bar2.style.background = "var(--accent-blue)";
          if (bar3) bar3.style.background = "var(--accent-blue)";
          if (strengthText) { strengthText.textContent = "Good"; strengthText.style.color = "var(--accent-blue)"; }
        } else {
          [bar1, bar2, bar3, bar4].forEach(b => { if (b) b.style.background = "var(--credit-green)"; });
          if (strengthText) { strengthText.textContent = "Strong"; strengthText.style.color = "var(--credit-green)"; }
        }
      };
    }

    // Real Form submit with backend integration
    regForm.onsubmit = async function (e) {
      e.preventDefault();

      const fullName = (document.getElementById("reg-fullname") || {}).value?.trim();
      const email = (document.getElementById("reg-email") || {}).value?.trim();
      const phone = (document.getElementById("reg-phone") || {}).value?.trim();
      const dob = (document.getElementById("reg-dob") || {}).value;
      const address = (document.getElementById("reg-address") || {}).value?.trim();
      const username = (document.getElementById("reg-username") || {}).value?.trim();
      const password = (document.getElementById("reg-password") || {}).value;
      const confirmPassword = (document.getElementById("reg-confirm-password") || {}).value;
      const submitBtn = document.getElementById("reg-submit-btn");

      // Format validation
      if (!fullName || !email || !phone || !dob || !address || !username || !password || !confirmPassword) {
        window.AegisToast.error("Incomplete Registration", "Please fill in all mandatory application fields.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        window.AegisToast.error("Invalid Email", "Please provide a valid email address (e.g. name@domain.com).");
        return;
      }

      if (password.length < 6) {
        window.AegisToast.error("Password Too Short", "Security standards require passwords to be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        window.AegisToast.error("Password Mismatch", "The entered passwords do not match. Please re-enter.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Creating Account in MySQL...</span>`;
      }

      const res = await window.AegisApi.register({
        fullName,
        email,
        phone,
        dob,
        address,
        username,
        password,
        confirmPassword,
        accountType: selectedAccountType
      });

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account</span>`;
      }

      if (res.success) {
        window.AegisModal.success({
          title: "Account Created Successfully",
          message: "Your new digital banking account has been persisted in MySQL. You can now access your dashboard.",
          txnId: "ACCT: " + res.accountNumber,
          receiptRows: [
            { label: "Account Holder", value: fullName },
            { label: "Account Type", value: res.accountType + " Account" },
            { label: "Account Number", value: res.accountNumber },
            { label: "Assigned IFSC", value: res.ifsc }
          ],
          onDone: function () {
            window.AegisApp.navigateTo("dashboard");
          }
        });
      } else {
        window.AegisToast.error("Registration Failed", res.message || "Failed to create account.");
      }
    };
  }

  return {
    initLogin,
    initRegister
  };
})();
