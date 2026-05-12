renderTopbar("users");

function getUserActionIcon(kind) {
  const icons = {
    access:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"></path><path d="M9.5 12.5l1.8 1.8 3.8-4.3"></path></svg>',
    delete:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path></svg>',
  };
  return icons[kind] || icons.access;
}

function renderUsers(users) {
  document.getElementById("userTableBody").innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>${user.name}</td>
          <td>${user.username}</td>
          <td>${user.role}</td>
          <td>${(user.access || []).map(formatStatus).join(", ") || "-"}</td>
          <td>${user.expiry}</td>
          <td>
            <div class="user-action-row">
              <a class="action-icon-btn action-icon-neutral" href="/access-level.html?userId=${user.id}" title="Assign access">${getUserActionIcon("access")}</a>
              <button class="action-icon-btn action-icon-danger delete-user-btn" type="button" data-id="${user.id}" data-username="${user.username}" title="Delete user">${getUserActionIcon("delete")}</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  document.querySelectorAll(".delete-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete user " + button.dataset.username + "?");
      if (!confirmed) {
        return;
      }

      try {
        const result = await fetchJson("/users/" + button.dataset.id, { method: "DELETE" });
        showToast(result.message, "success");
        await loadUsers();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

async function loadUsers() {
  const users = await fetchJson("/users");
  renderUsers(users);
}

document.getElementById("userForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    await fetchJson("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        username: form.get("username"),
        password: form.get("password"),
        role: form.get("role"),
        expiry: form.get("expiry"),
      }),
    });

    event.currentTarget.reset();
    showMessage("userMessage", "User added successfully.", "success");
    showToast("User added successfully", "success");
    await loadUsers();
  } catch (error) {
    showMessage("userMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

loadUsers();
