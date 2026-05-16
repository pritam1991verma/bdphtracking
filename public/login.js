if (getCurrentUser()) {
  window.location.href = getFirstAllowedPage(getCurrentUser());
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("loginMessage", "Signing in...", "");

  try {
    const data = await fetchJson("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      }),
    });

    setCurrentUser(data.user);
    showMessage("loginMessage", "Login successful. Redirecting...", "success");
    window.location.href = getFirstAllowedPage(data.user);
  } catch (error) {
    showMessage("loginMessage", error.message, "error");
  }
  const changePasswordBtn =
document.getElementById("changePasswordBtn");

const passwordModal =
document.getElementById("passwordModal");

const closePasswordBtn =
document.getElementById("closePasswordBtn");

const savePasswordBtn =
document.getElementById("savePasswordBtn");

/* OPEN */

if(changePasswordBtn){

changePasswordBtn.onclick = function(){

passwordModal.style.display = "flex";

};

}

/* CLOSE */

if(closePasswordBtn){

closePasswordBtn.onclick = function(){

passwordModal.style.display = "none";

};

}

/* SAVE */

if(savePasswordBtn){

savePasswordBtn.onclick = function(){

const oldPass =
document.getElementById("oldPassword").value;

const newPass =
document.getElementById("newPassword").value;

const confirmPass =
document.getElementById("confirmPassword").value;

if(!oldPass || !newPass || !confirmPass){

alert("Fill all fields");

return;

}

if(newPass !== confirmPass){

alert("Password not matched");

return;

}

alert("Password changed successfully");

passwordModal.style.display = "none";

};

}
});
