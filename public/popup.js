import { GoogleGenerativeAI } from "./generative-ai.js";

/* ------------------ CONFIG ------------------ */
const DEFAULT_API_KEY = "AIzaSyCZ3QlJ94I8JgyBLujYbvJ6eL1tbnmE_Yc";

/* ------------------ ACTION TASKS (MATCH HTML VALUES) ------------------ */
const ACTION_TASKS = {
  correct: `
Fix grammar, spelling, punctuation, and tense.
Keep the original meaning and structure.
`,

  polish: `
Improve tone and flow.
Make the writing sound smoother and more natural.
Do not change meaning.
`,

  rephrase: `
Rewrite the text using different wording.
Avoid repeating sentence structure.
Preserve meaning.
`,

  clear: `
Rewrite the text to improve clarity and readability.
Simplify confusing sentences.
`,

  professional: `
Rewrite the text in a formal, professional tone.
Avoid casual language.
`,

  shorten: `
Make the text concise.
Remove repetition and unnecessary words.
Preserve meaning.
`
};

document.addEventListener("DOMContentLoaded", () => {
  /* ------------------ UI ELEMENTS ------------------ */
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
  const mainToast = document.getElementById("mainToast");

  /* ------------------ INIT API KEY STATUS ------------------ */
  chrome.storage.local.get(["gramify_custom_key"], (res) => {
    if (res.gramify_custom_key) {
      customKeyInput.value = res.gramify_custom_key;
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
      keyStatus.textContent = "Using Default Key";
      keyStatus.className = "status-badge status-using-default";
    }
  }

  function showToast(msg) {
    mainToast.textContent = msg;
    mainToast.classList.add("show");
    setTimeout(() => mainToast.classList.remove("show"), 2000);
  }

  /* ------------------ DARK MODE ------------------ */
  themeBtn.addEventListener("click", () => {
    app.classList.toggle("dark");
    const isDark = app.classList.contains("dark");
    sunIcon.style.display = isDark ? "block" : "none";
    moonIcon.style.display = isDark ? "none" : "block";
  });

  /* ------------------ SETTINGS PANEL ------------------ */
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("open");
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("open");
  });

  saveKeyBtn.addEventListener("click", () => {
    const key = customKeyInput.value.trim();
    if (key) {
      chrome.storage.local.set({ gramify_custom_key: key }, () => {
        updateKeyStatus(true);
        showToast("API Key Saved");
        settingsPanel.classList.remove("open");
      });
    } else {
      chrome.storage.local.remove("gramify_custom_key", () => {
        updateKeyStatus(false);
        showToast("Using Default Key");
      });
    }
  });

  /* ------------------ MAIN LOGIC ------------------ */
  fixBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    const action = actionSelect.value;

    if (!text) {
      inputText.classList.add("input-error");
      setTimeout(() => inputText.classList.remove("input-error"), 500);
      return;
    }

    chrome.storage.local.get(["gramify_custom_key"], async (res) => {
      const apiKey =
        res.gramify_custom_key && res.gramify_custom_key.length > 10
          ? res.gramify_custom_key
          : DEFAULT_API_KEY;

      loader.classList.add("active");
      fixBtn.disabled = true;
      resultsWrapper.classList.remove("visible");

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";

        /* ------------------ EXPAND ------------------ */
        if (action === "expand") {
          prompt = `
You are a skilled writer and editor.

CRITICAL RULES:
• "corrected" must be plain text only.
• No HTML or tags.
• Output must be grammatically correct.

TASK:
Expand the text by adding context, emotion, and detail.
Add new sentences naturally.

INPUT:
"${text}"

OUTPUT JSON ONLY:
{
  "corrected": "expanded and grammatically correct plain text",
  "explanation": "<ul><li>Expanded content with added detail and context.</li></ul>"
}
`;
        } else {
          const task = ACTION_TASKS[action] || ACTION_TASKS.correct;

          prompt = `
You are an advanced grammar and writing assistant.

CRITICAL RULES:
• "corrected" must be plain text only.
• HTML allowed ONLY in "explanation".

INPUT:
"${text}"

TASK:
${task}

EXPLANATION RULES:
• Highlight ONLY exact changed words.
• Never wrap full sentences.

Classes:
- Grammar → <span class="fix-grammar">
- Spelling → <span class="fix-spelling">
- Style → <span class="fix-style">
- Clarity → <span class="fix-clarity">

OUTPUT JSON ONLY:
{
  "corrected": "plain text only",
  "explanation": "<ul><li>...</li></ul>"
}
`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;

        const clean = response.text().replace(/```json|```/gi, "").trim();
        const json = JSON.parse(clean);

        outputText.value = json.corrected.replace(/<[^>]*>/g, "");
        explainBox.innerHTML = json.explanation || "";
        resultsWrapper.classList.add("visible");
      } catch (err) {
        console.error(err);
        const msg = err.message || "";

        if (
          msg.includes("403") ||
          msg.includes("429") ||
          msg.includes("quota") ||
          msg.includes("API key") ||
          msg.includes("leaked")
        ) {
          settingsPanel.classList.add("open");
          showToast("Please add your own Gemini API key");
        } else {
          explainBox.innerHTML = `<span style="color:red;">${msg}</span>`;
          resultsWrapper.classList.add("visible");
        }
      } finally {
        loader.classList.remove("active");
        fixBtn.disabled = false;
      }
    });
  });

  /* ------------------ COPY ------------------ */
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(outputText.value);
    showToast("Copied!");
  });
});
