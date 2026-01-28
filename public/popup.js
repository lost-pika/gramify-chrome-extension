import { GoogleGenerativeAI } from "./generative-ai.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const themeBtn = document.getElementById("themeBtn");
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  // Settings Elements
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

  // --- INITIALIZE SETTINGS WITH CHROME STORAGE ---
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
      keyStatus.textContent = "Key Saved ✓";
      keyStatus.className = "status-badge status-using-custom";
    } else {
      keyStatus.textContent = "No Key Saved";
      keyStatus.className = "status-badge status-using-default";
    }
  }

  function showMainToast(msg) {
    mainToast.textContent = msg;
    mainToast.classList.add("show");
    setTimeout(() => mainToast.classList.remove("show"), 2000);
  }

  // --- THEME TOGGLE ---
  themeBtn.addEventListener("click", () => {
    app.classList.toggle("dark");
    const isDark = app.classList.contains("dark");
    sunIcon.style.display = isDark ? "block" : "none";
    moonIcon.style.display = isDark ? "none" : "block";
  });

  // --- SETTINGS PANEL LOGIC ---
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("open");
    if (!customKeyInput.value) {
      setTimeout(() => customKeyInput.focus(), 300);
    }
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("open");
  });

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

  // --- MAIN FIX LOGIC ---
  fixBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    const action = actionSelect.value;

    if (!text) {
      inputText.classList.add("input-error");
      setTimeout(() => inputText.classList.remove("input-error"), 500);
      return;
    }

    // CHECK FOR KEY IN STORAGE
    chrome.storage.local.get(["gramify_custom_key"], async (result) => {
      const apiKeyToUse = result.gramify_custom_key;

      if (!apiKeyToUse) {
        settingsPanel.classList.add("open");
        customKeyInput.focus();
        customKeyInput.classList.add("input-error");
        setTimeout(() => customKeyInput.classList.remove("input-error"), 1000);
        showMainToast("Please enter an API Key first");
        return;
      }

      // UI Loading
      loader.classList.add("active");
      fixBtn.disabled = true;
      fixBtn.querySelector("span").textContent = "";
      resultsWrapper.classList.remove("visible");

      try {
        const genAI = new GoogleGenerativeAI(apiKeyToUse);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });

        let instruction = "";
        let rules = "";

        switch (action) {
          case "correct":
            instruction = "CORRECT GRAMMAR";
            rules =
              "Fix all grammar, spelling, and punctuation errors. Keep the original meaning.";
            break;
          case "polish":
            instruction = "POLISH TONE";
            rules =
              "Improve flow and vocabulary. Make it sound native and engaging.";
            break;
          case "rephrase":
            instruction = "REPHRASE";
            rules = "Rewrite text using different words, keeping same meaning.";
            break;
          case "clear":
            instruction = "SIMPLIFY";
            rules = "Make text simple and clear. Remove complexity.";
            break;
          case "shorten":
            instruction = "SHORTEN";
            rules = "Reduce word count significantly. Be concise.";
            break;
          case "professional":
            instruction = "PROFESSIONAL";
            rules = "Rewrite to sound formal and corporate.";
            break;
          case "expand":
            instruction = "EXPAND";
            rules = "Add relevant details and elaboration.";
            break;
          default:
            instruction = "CORRECT GRAMMAR";
            rules = "Fix grammar.";
        }

        const prompt = `
          You are a text transformation engine. Output MUST be valid JSON only.
          
          MODE: ${instruction}
          RULES: ${rules}
          INPUT TEXT: "${text}"
          
          JSON Structure:
          {
            "corrected": "the transformed text",
            "explanation": "bulleted summary of changes"
          }`;

        const genResult = await model.generateContent(prompt);
        const response = await genResult.response;
        let textResponse = response.text();

        // Basic JSON cleaning
        textResponse = textResponse.replace(/```json|```/gi, "").trim();
        const json = JSON.parse(textResponse);

        outputText.value = json.corrected;
        explainBox.innerHTML = json.explanation;
        resultsWrapper.classList.add("visible");
      } catch (err) {
        console.error(err);
        explainBox.textContent = "Error: " + err.message;
        resultsWrapper.classList.add("visible");
      } finally {
        fixBtn.disabled = false;
        fixBtn.querySelector("span").textContent = "Fix";
        loader.classList.remove("active");
      }
    });
  });

  // --- COPY LOGIC ---
  copyBtn.addEventListener("click", () => {
    if (!outputText.value) return;
    navigator.clipboard.writeText(outputText.value).then(() => {
      copyToast.classList.add("show");
      setTimeout(() => copyToast.classList.remove("show"), 1200);
    });
  });
});
