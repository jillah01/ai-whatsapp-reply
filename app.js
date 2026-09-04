const API_URL = "https://reply-ai-api.xjillah.workers.dev";

const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const whatsappBtn = document.getElementById("whatsappBtn");

const messageEl = document.getElementById("message");
const languageEl = document.getElementById("language");
const toneEl = document.getElementById("tone");

const resultSection = document.getElementById("resultSection");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");

const charCountEl = document.getElementById("charCount");
const inputCountEl = document.getElementById("inputCount");

let selectedCategory = "General";

document.querySelectorAll(".category").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    selectedCategory = button.dataset.category;
  });
});

messageEl.addEventListener("input", () => {
  inputCountEl.textContent = `${messageEl.value.length}/1000`;
});

function setStatus(message) {
  statusEl.textContent = message;
}

function updateResultCount() {
  charCountEl.textContent = `${resultEl.value.length} characters`;
}

generateBtn.addEventListener("click", async () => {
  const message = messageEl.value.trim();

  if (!message) {
    setStatus("Please enter the customer's message.");
    messageEl.focus();
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  setStatus("");
  resultEl.value = "";
  resultSection.classList.add("hidden");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        language: languageEl.value,
        tone: toneEl.value,
        category: selectedCategory
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Request failed.");
    }

    if (!data.reply) {
      throw new Error("No reply was returned.");
    }

    resultEl.value = data.reply;
    updateResultCount();
    resultSection.classList.remove("hidden");
    setStatus("Reply generated successfully.");
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error.message}`);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Reply";
  }
});

copyBtn.addEventListener("click", async () => {
  if (!resultEl.value) return;

  try {
    await navigator.clipboard.writeText(resultEl.value);
    const oldText = copyBtn.textContent;
    copyBtn.textContent = "✓ Copied!";
    setTimeout(() => {
      copyBtn.textContent = oldText;
    }, 1400);
  } catch (error) {
    resultEl.focus();
    resultEl.select();
    document.execCommand("copy");
  }
});

whatsappBtn.addEventListener("click", () => {
  if (!resultEl.value) return;

  const text = encodeURIComponent(resultEl.value);
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
});

updateResultCount();
