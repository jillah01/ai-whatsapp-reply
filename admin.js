const SUPABASE_URL =
  "https://penntuaofjveawocdvgp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "YOUR_EXISTING_SUPABASE_PUBLISHABLE_KEY";

const $ = (id) => document.getElementById(id);

if (!window.supabase) {
  $("msg").textContent = "Supabase library did not load.";
  throw new Error("Supabase library did not load");
}

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

function message(text) {
  $("msg").textContent = text || "";
}

async function loadUsers() {
  const { data, error } = await client.rpc("admin_list_users");

  if (error) {
    message(error.message);
    return;
  }

  $("users").innerHTML = (data || []).map((u) => `
    <tr>
      <td>${String(u.email || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}</td>

      <td>
        <select data-plan="${u.user_id}">
          <option value="free" ${u.plan === "free" ? "selected" : ""}>
            Free
          </option>
          <option value="pro" ${u.plan === "pro" ? "selected" : ""}>
            Pro
          </option>
        </select>
      </td>

      <td>${Number(u.reply_count || 0)}</td>

      <td>
        <button type="button" data-save="${u.user_id}">
          Save
        </button>
      </td>
    </tr>
  `).join("");
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value;

  message("");

  if (!email || !password) {
    message("Enter your email and password.");
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "Logging in...";

  const { data, error } =
    await client.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    message(error.message);
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Login";
    return;
  }

  $("login").classList.add("hidden");
  $("dash").classList.remove("hidden");

  $("me").textContent =
    data.user?.email || "Admin";

  await loadUsers();

  $("loginBtn").disabled = false;
  $("loginBtn").textContent = "Login";
}

$("loginBtn").addEventListener("click", login);

$("logout").addEventListener("click", async () => {
  await client.auth.signOut();
  location.reload();
});

$("users").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;

  const userId = button.dataset.save;
  const select =
    document.querySelector(`[data-plan="${userId}"]`);

  const { error } =
    await client.rpc("admin_set_plan", {
      p_user_id: userId,
      p_plan: select.value
    });

  if (error) {
    alert(error.message);
    return;
  }

  await loadUsers();
});
