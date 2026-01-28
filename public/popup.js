import { GoogleGenerativeAI } from "./generative-ai.js";

// --- CONFIGURATION ---
// Default key remains for testing/reference but is not used unless manually swapped.
const DEFAULT_API_KEY = "AIzaSyCZ3QlJ94I8JgyBLujYbvJ6eL1tbnmE_Yc";

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const themeBtn = document.getElementById("themeBtn");
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const customKeyInput = document.getElementById("customKeyInput");
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const keyStatus = document.getElementById("keyStatus");

  const inputText = document.getElementById("inputText");
  const actionSelect = document.getElementById("actionSelect");
  const fixBtn = document.getElementById("fixBtn");
  const loader = document.getElementById("loader");
  const resultsWrapper = document.getElementById("resultsWrapper");
  const outputText = document.getElementById("outputText");
  const explainBox = document.getElementById("explainBox");
  const copyBtn = document.getElementById("copyBtn");
  const copyToast = document.getElementById("copyToast");
  const mainToast = document.getElementById("mainToast");

  // --- INITIALIZE SETTINGS ---
  chrome.storage.local.get(["gramify_custom_key"], (result) => {
    if (result.gramify_custom_key) {
      customKeyInput.value = result.gramify_custom_key;
      updateKeyStatus(true);
    } else {
      updateKeyStatus(false);
    }
  });

  function updateKeyStatus(hasCustom) {
    keyStatus.style.display = "inline-block";
    if (hasCustom) {
      keyStatus.textContent = "Your Key Saved ✓";
      keyStatus.className = "status-badge status-using-custom";
    } else {
      keyStatus.textContent = "Please add your API Key";
      keyStatus.className = "status-badge status-using-default";
    }
  }

  function showMainToast(msg) {
    mainToast.textContent = msg;
    mainToast.classList.add("show");
    setTimeout(() => mainToast.classList.remove("show"), 2000);
  }

  // --- THEME & SETTINGS UI ---
  themeBtn.addEventListener("click", () => {
    app.classList.toggle("dark");
    const isDark = app.classList.contains("dark");
    sunIcon.style.display = isDark ? "block" : "none";
    moonIcon.style.display = isDark ? "none" : "block";
  });

  settingsBtn.addEventListener("click", () => settingsPanel.classList.add("open"));
  closeSettingsBtn.addEventListener("click", () => settingsPanel.classList.remove("open"));

  saveKeyBtn.addEventListener("click", () => {
    const key = customKeyInput.value.trim();
    if (key) {
      chrome.storage.local.set({ gramify_custom_key: key }, () => {
        updateKeyStatus(true);
        saveKeyBtn.textContent = "Saved!";
        setTimeout(() => {
          saveKeyBtn.textContent = "Save Key";
          settingsPanel.classList.remove("open");
          showMainToast("API Key Saved");
        }, 800);
      });
    } else {
      chrome.storage.local.remove("gramify_custom_key", () => {
        updateKeyStatus(false);
        saveKeyBtn.textContent = "Cleared!";
        setTimeout(() => (saveKeyBtn.textContent = "Save Key"), 1500);
      });
    }
  });

  // --- MAIN LOGIC ---
  fixBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    if (!text) {
      inputText.classList.add("input-error");
      setTimeout(() => inputText.classList.remove("input-error"), 500);
      return;
    }

    chrome.storage.local.get(["gramify_custom_key"], async (result) => {
      const apiKeyToUse = result.gramify_custom_key;

      if (!apiKeyToUse) {
        settingsPanel.classList.add("open");
        customKeyInput.focus();
        customKeyInput.classList.add("input-error");
        showMainToast("Please enter an API Key first");
        return;
      }

      loader.classList.add("active");
      fixBtn.disabled = true;
      resultsWrapper.classList.remove("visible");

      try {
        const genAI = new GoogleGenerativeAI(apiKeyToUse);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          You are a professional editor. Transform the text below.
          
          MODE: ${actionSelect.value}
          INPUT: "${text}"
          
          INSTRUCTIONS:
          1. Provide the corrected text.
          2. Provide an explanation of changes as a VALID HTML STRING.
          3. The explanation MUST be a <ul> list with <li> items.
          4. Highlight key changes (like specific grammar fixes or word swaps) using <strong> tags.
          
          OUTPUT FORMAT (JSON only):
          {
            "corrected": "your corrected text",
            "explanation": "<ul><li>Fixed <strong>subject-verb agreement</strong> in the first sentence.</li><li>Replaced 'good' with <strong>'exceptional'</strong> for better tone.</li></ul>"
          }`;

        const genResult = await model.generateContent(prompt);
        const response = await genResult.response;
        let textResponse = response.text().replace(/```json|```/gi, "").trim();
        
        const json = JSON.parse(textResponse);

        // Update UI
        outputText.value = json.corrected;
        // Using innerHTML so the <ul> and <strong> tags render correctly
        explainBox.innerHTML = json.explanation; 
        
        resultsWrapper.classList.add("visible");
      } catch (err) {
        console.error(err);
        explainBox.innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
        resultsWrapper.classList.add("visible");
      }finally {
        fixBtn.disabled = false;
        loader.classList.remove("active");
      }
    });
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(outputText.value).then(() => {
      copyToast.classList.add("show");
      setTimeout(() => copyToast.classList.remove("show"), 1200);
    });
  });
});