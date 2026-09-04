const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");

const messageInput = document.getElementById("message");
const languageInput = document.getElementById("language");
const toneInput = document.getElementById("tone");

const resultBox = document.getElementById("resultBox");
const result = document.getElementById("result");
const loading = document.getElementById("loading");

const API_URL = "https://reply-ai-api.xjillah.workers.dev";

generateBtn.addEventListener("click", async () => {

    const message = messageInput.value.trim();

    if (!message) {
        alert("Please enter a customer message.");
        return;
    }

    loading.classList.remove("hidden");
    resultBox.classList.add("hidden");
    generateBtn.disabled = true;

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message,
                language: languageInput.value,
                tone: toneInput.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Server error");
        }

        result.value = data.reply;
        resultBox.classList.remove("hidden");

    } catch (error) {

        console.error(error);

        alert(
            "Something went wrong: " + error.message
        );

    } finally {

        loading.classList.add("hidden");
        generateBtn.disabled = false;

    }

});

copyBtn.addEventListener("click", async () => {

    if (!result.value) return;

    try {
        await navigator.clipboard.writeText(result.value);

        copyBtn.innerText = "Copied!";

        setTimeout(() => {
            copyBtn.innerText = "Copy Reply";
        }, 1500);

    } catch (error) {
        console.error(error);
    }

});
