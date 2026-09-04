const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");

const messageInput = document.getElementById("message");
const languageInput = document.getElementById("language");
const toneInput = document.getElementById("tone");

const resultBox = document.getElementById("resultBox");
const result = document.getElementById("result");
const loading = document.getElementById("loading");

generateBtn.addEventListener("click", async () => {

    const message = messageInput.value.trim();

    if (!message) {
        alert("Please enter a customer message.");
        return;
    }

    loading.classList.remove("hidden");
    resultBox.classList.add("hidden");

    try {

        const response = await fetch(
            "YOUR_CLOUDFLARE_WORKER_URL",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message,
                    language: languageInput.value,
                    tone: toneInput.value
                })
            }
        );

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        result.value = data.reply;

        resultBox.classList.remove("hidden");

    } catch (error) {

        alert(
            "Something went wrong. Please try again."
        );

        console.error(error);

    } finally {

        loading.classList.add("hidden");

    }

});

copyBtn.addEventListener("click", async () => {

    await navigator.clipboard.writeText(result.value);

    copyBtn.innerText = "Copied!";

    setTimeout(() => {
        copyBtn.innerText = "Copy Reply";
    }, 1500);

});
