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
});
