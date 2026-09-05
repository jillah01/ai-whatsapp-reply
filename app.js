const API_URL = "https://reply-ai-api.xjillah.workers.dev";
const PROFILE_KEY = "replyai_profile_v4";
const HISTORY_KEY = "replyai_history_v4";

const $ = (id) => document.getElementById(id);
let selectedCategory = "General";
let history = loadHistory();

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    $("businessName").value = p.businessName || "";
    $("businessType").value = p.businessType || "";
    $("language").value = p.language || "Hinglish";
    $("tone").value = p.tone || "Friendly";
    $("style").value = p.style || "";
    $("replyLanguage").value = p.language || "Hinglish";
    $("replyTone").value = p.tone || "Friendly";
  } catch {}
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); }
  catch { return {}; }
}

function saveProfile(showMessage = true) {
  const p = {
    businessName: $("businessName").value.trim(),
    businessType: $("businessType").value.trim(),
    language: $("language").value,
    tone: $("tone").value,
    style: $("style").value.trim()
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  $("replyLanguage").value = p.language;
  $("replyTone").value = p.tone;
  if (showMessage) {
    $("profileStatus").textContent = "Business profile saved on this browser.";
    setTimeout(() => $("profileStatus").textContent = "", 1800);
  }
}

function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
  $("businessName").value = "";
  $("businessType").value = "";
  $("language").value = "Hinglish";
  $("tone").value = "Friendly";
  $("style").value = "";
  $("replyLanguage").value = "Hinglish";
  $("replyTone").value = "Friendly";
  $("profileStatus").textContent = "Profile cleared.";
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function storeHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  renderHistory();
}

function sameDay(ts) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function renderHistory() {
  $("todayCount").textContent = String(history.filter(x => sameDay(x.time)).length);
  if (!history.length) {
    $("history").innerHTML = '<div class="history-empty">No saved replies yet.</div>';
    return;
  }
  $("history").innerHTML = history.map((item, i) => `
    <article class="history-item">
      <div class="history-top">
        <span class="history-tag">${escapeHtml(item.category)}</span>
        <span class="history-date">${escapeHtml(new Date(item.time).toLocaleString())}</span>
      </div>
      <p class="history-message">${escapeHtml(item.message)}</p>
      <p class="history-reply">${escapeHtml(item.reply)}</p>
      <div class="history-actions">
        <button type="button" data-action="use" data-index="${i}">Use reply</button>
        <button type="button" data-action="copy" data-index="${i}">Copy</button>
      </div>
    </article>
  `).join("");
}

function addHistory(message, reply) {
  history.unshift({ message, reply, category: selectedCategory, time: Date.now() });
  history = history.slice(0, 10);
  storeHistory();
}

function updateCounts() {
  $("inputCount").textContent = `${$("message").value.length}/1000`;
  $("charCount").textContent = `${$("result").value.length} characters`;
}

function setStatus(text) {
  $("status").textContent = text;
}

async function requestAI(action = "generate") {
  const profile = getProfile();
  const existingReply = $("result").value.trim();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: $("message").value.trim(),
      language: $("replyLanguage").value,
      tone: $("replyTone").value,
      category: selectedCategory,
      businessName: profile.businessName || "",
      businessType: profile.businessType || "",
      businessStyle: profile.style || "",
      action,
      existingReply
    })
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 429) {
    throw new Error("Too many requests. Please wait about a minute and try again.");
  }
  if (!response.ok) throw new Error(data.error || "Request failed.");
  if (!data.reply) throw new Error("No reply was returned.");
  return data.reply;
}

async function generate() {
  const message = $("message").value.trim();
  if (!message) {
    setStatus("Please enter the customer's message.");
    $("message").focus();
    return;
  }

  $("generateBtn").disabled = true;
  $("generateBtn").textContent = "Generating...";
  setStatus("");

  try {
    const reply = await requestAI("generate");
    $("result").value = reply;
    updateCounts();
    $("resultSection").classList.remove("hidden");
    addHistory(message, reply);
    setStatus("Reply generated and saved.");
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`);
  } finally {
    $("generateBtn").disabled = false;
    $("generateBtn").textContent = "Generate Reply";
  }
}

async function rewrite(action, button) {
  if (!$("result").value.trim()) return;
  const old = button.textContent;
  button.disabled = true;
  button.textContent = "Working...";
  try {
    const reply = await requestAI(action);
    $("result").value = reply;
    updateCounts();
    addHistory($("message").value.trim(), reply);
    setStatus("Updated reply saved.");
  } catch (e) {
    setStatus(`Error: ${e.message}`);
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

document.querySelectorAll(".category").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    selectedCategory = btn.dataset.category;
  });
});

$("saveProfileBtn").addEventListener("click", () => saveProfile(true));
$("clearProfileBtn").addEventListener("click", clearProfile);
$("generateBtn").addEventListener("click", generate);
$("message").addEventListener("input", updateCounts);

$("language").addEventListener("change", () => $("replyLanguage").value = $("language").value);
$("tone").addEventListener("change", () => $("replyTone").value = $("tone").value);

$("copyBtn").addEventListener("click", async () => {
  if (!$("result").value) return;
  try {
    await navigator.clipboard.writeText($("result").value);
    $("copyBtn").textContent = "✓ Copied";
    setTimeout(() => $("copyBtn").textContent = "📋 Copy", 1200);
  } catch {
    $("result").focus(); $("result").select(); document.execCommand("copy");
  }
});

$("whatsappBtn").addEventListener("click", () => {
  if (!$("result").value) return;
  window.open(`https://wa.me/?text=${encodeURIComponent($("result").value)}`, "_blank");
});

$("shorterBtn").addEventListener("click", () => rewrite("shorter", $("shorterBtn")));
$("politeBtn").addEventListener("click", () => rewrite("politer", $("politeBtn")));
$("professionalBtn").addEventListener("click", () => rewrite("professional", $("professionalBtn")));

$("clearHistoryBtn").addEventListener("click", () => {
  history = [];
  storeHistory();
});

$("history").addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const item = history[Number(btn.dataset.index)];
  if (!item) return;

  if (btn.dataset.action === "use") {
    $("message").value = item.message;
    $("result").value = item.reply;
    selectedCategory = item.category;
    document.querySelectorAll(".category").forEach(x => x.classList.toggle("active", x.dataset.category === selectedCategory));
    updateCounts();
    $("resultSection").classList.remove("hidden");
    setStatus("Previous reply loaded.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (btn.dataset.action === "copy") {
    try {
      await navigator.clipboard.writeText(item.reply);
      btn.textContent = "Copied";
      setTimeout(() => btn.textContent = "Copy", 1000);
    } catch {}
  }
});

loadProfile();
updateCounts();
renderHistory();
