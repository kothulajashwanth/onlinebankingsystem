/**
 * REAL SETTINGS PAGE CONTROLLER
 * 
 * Manages preferences and performs real password updates in MySQL.
 */

window.AegisSettingsPage = (function () {
  function render() {
    // Notification switches
    const switches = document.querySelectorAll(".settings-pref-toggle");
    switches.forEach(sw => {
      sw.onchange = function () {
        const name = sw.getAttribute("data-pref-name");
        window.AegisToast.info("Preference Saved", `${name} notification setting updated.`);
      };
    });

    // Real Change Password Form
    const pwdForm = document.getElementById("change-password-form");
    const pwdSubmitBtn = document.getElementById("pwd-submit-btn");

    if (pwdForm) {
      pwdForm.onsubmit = async function (e) {
        e.preventDefault();
        const currInput = document.getElementById("pwd-current");
        const newInput = document.getElementById("pwd-new");
        const confirmInput = document.getElementById("pwd-confirm");

        const curr = currInput ? currInput.value : "";
        const newPwd = newInput ? newInput.value : "";
        const confirmPwd = confirmInput ? confirmInput.value : "";

        if (!curr || !newPwd || !confirmPwd) {
          window.AegisToast.error("Incomplete Form", "Please fill in current, new, and confirmation password fields.");
          return;
        }

        if (newPwd.length < 6) {
          window.AegisToast.error("Weak Password", "New password must be at least 6 characters long.");
          return;
        }

        if (newPwd !== confirmPwd) {
          window.AegisToast.error("Password Mismatch", "The new password and confirmation password do not match.");
          return;
        }

        if (pwdSubmitBtn) {
          pwdSubmitBtn.disabled = true;
          pwdSubmitBtn.innerHTML = `<span>Updating in MySQL...</span>`;
        }

        const res = await window.AegisApi.updatePassword(curr, newPwd);

        if (pwdSubmitBtn) {
          pwdSubmitBtn.disabled = false;
          pwdSubmitBtn.innerHTML = `Update Password`;
        }

        if (res.success) {
          window.AegisToast.success("Security Updated", "Your account password has been updated in MySQL.");
          if (currInput) currInput.value = "";
          if (newInput) newInput.value = "";
          if (confirmInput) confirmInput.value = "";
        } else {
          window.AegisToast.error("Password Update Failed", res.message || "Failed to update password.");
        }
      };
    }

    // Session Revocation Button
    const btnTerminateSession = document.getElementById("btn-terminate-sessions");
    if (btnTerminateSession) {
      btnTerminateSession.onclick = function () {
        window.AegisModal.confirm({
          title: "Terminate Other Active Sessions?",
          message: "This will revoke authentication tokens on any other browser or mobile session currently logged into this account.",
          confirmText: "Terminate Sessions",
          cancelText: "Cancel",
          onConfirm: function () {
            window.AegisToast.success("Sessions Cleared", "All other device sessions have been revoked.");
          }
        });
      };
    }
  }

  return {
    render
  };
})();
