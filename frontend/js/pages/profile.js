/**
 * REAL PROFILE PAGE CONTROLLER
 * 
 * Retrieves real user identity from MySQL and performs database updates.
 */

window.AegisProfilePage = (function () {
  async function render() {
    const res = await window.AegisApi.getAccountDetails();
    if (!res.success) {
      window.AegisToast.error("Session Error", "Please sign in to view your profile.");
      window.AegisApp.navigateTo("login");
      return;
    }

    const user = res.user;
    const account = res.account;

    // Display Hero
    const profAvatar = document.getElementById("profile-avatar-initials");
    const profName = document.getElementById("profile-hero-fullname");
    const profRole = document.getElementById("profile-hero-role");

    if (profName) profName.textContent = user.fullName;
    if (profRole) profRole.textContent = `${account.accountType} Member • ID: #${user.id}`;
    if (profAvatar) {
      const initials = (user.fullName || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      profAvatar.textContent = initials;
    }

    // Editable form fields
    const fnInput = document.getElementById("profile-input-fullname");
    const emInput = document.getElementById("profile-input-email");
    const phInput = document.getElementById("profile-input-phone");
    const addrInput = document.getElementById("profile-input-address");
    const saveBtn = document.getElementById("profile-save-btn");

    if (fnInput) fnInput.value = user.fullName || "";
    if (emInput) emInput.value = user.email || "";
    if (phInput) phInput.value = user.phone || "";
    if (addrInput) addrInput.value = user.address || "";

    // Locked non-editable fields
    const unInput = document.getElementById("profile-input-username");
    const acctInput = document.getElementById("profile-input-accnumber");
    const typeInput = document.getElementById("profile-input-acctype");

    if (unInput) unInput.value = user.username || "";
    if (acctInput) acctInput.value = account.accountNumber || "";
    if (typeInput) typeInput.value = `${account.accountType} Account`;

    // Save profile form directly to MySQL
    const form = document.getElementById("profile-edit-form");
    if (form) {
      form.onsubmit = async function (e) {
        e.preventDefault();

        const updatedName = fnInput ? fnInput.value.trim() : "";
        const updatedEmail = emInput ? emInput.value.trim() : "";
        const updatedPhone = phInput ? phInput.value.trim() : "";
        const updatedAddress = addrInput ? addrInput.value.trim() : "";

        if (!updatedName || !updatedEmail || !updatedPhone || !updatedAddress) {
          window.AegisToast.error("Validation Error", "Profile fields cannot be left empty.");
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updatedEmail)) {
          window.AegisToast.error("Invalid Email", "Please enter a valid email address.");
          return;
        }

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<span>Saving to MySQL...</span>`;
        }

        const updateRes = await window.AegisApi.updateProfile({
          fullName: updatedName,
          email: updatedEmail,
          phone: updatedPhone,
          address: updatedAddress
        });

        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span>Save Profile Changes</span>`;
        }

        if (updateRes.success) {
          window.AegisToast.success("Profile Updated", "Your changes have been saved to MySQL.");
          render();
          window.AegisApp.updateSidebarUser();
        } else {
          window.AegisToast.error("Update Failed", updateRes.message || "Failed to update profile.");
        }
      };
    }
  }

  return {
    render
  };
})();
