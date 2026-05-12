const currentUser = renderTopbar("access-level");
let availablePages = [];
let allUsers = [];

function getSelectedUserIdFromQuery() {
  return new URLSearchParams(window.location.search).get("userId") || "";
}

function renderUserSelect(users) {
  const select = document.getElementById("accessUserSelect");
  const requestedId = getSelectedUserIdFromQuery();
  const selectedId = select.value || requestedId;
  select.innerHTML =
    '<option value="">All users</option>' +
    users
      .map(
        (user) =>
          `<option value="${user.id}" ${String(user.id) === String(selectedId) ? "selected" : ""}>${user.name} | ${user.username}</option>`,
      )
      .join("");
}

function renderAccessGrid(users) {
  const grid = document.getElementById("accessGrid");
  const selectedId = document.getElementById("accessUserSelect").value;
  const visibleUsers = selectedId ? users.filter((user) => String(user.id) === String(selectedId)) : users;
  grid.innerHTML = visibleUsers
    .map(
      (user) => `
        <form class="access-card" data-id="${user.id}">
          <div class="access-head">
            <div>
              <strong>${user.name}</strong>
              <div class="small">${user.username} | ${user.role}</div>
            </div>
            <button class="btn btn-secondary" type="submit">Save Access</button>
          </div>
          <div class="access-checkboxes">
            ${availablePages
              .map(
                (page) => `
                  <label class="check-chip">
                    <input type="checkbox" name="access" value="${page.key}" ${user.access.includes(page.key) ? "checked" : ""} />
                    <span>${page.label}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </form>
      `,
    )
    .join("");

  document.querySelectorAll(".access-card").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const access = formData.getAll("access");

      try {
        const result = await fetchJson("/users/" + form.dataset.id + "/access", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access }),
        });

        if (result.user.id === currentUser.id) {
          setCurrentUser(result.user);
        }

        showToast("Access updated successfully", "success");
        await loadAccessLevels();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

async function loadAccessLevels() {
  const [config, users] = await Promise.all([fetchJson("/config"), fetchJson("/users")]);
  allUsers = users;
  availablePages = config.pages.map((page) => ({
    key: page,
    label: formatStatus(page),
  }));
  renderUserSelect(users);
  renderAccessGrid(users);
}

document.getElementById("accessUserSelect").addEventListener("change", () => {
  renderAccessGrid(allUsers);
});

loadAccessLevels();
