document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const formatBtn = document.getElementById("format-json");
    const minimizeBtn = document.getElementById("minimize-json");
    const clearBtn = document.getElementById("clear-input");
    const copyBtn = document.getElementById("copy-to-clipboard");
    const downloadBtn = document.getElementById("download-json");
    const openTabBtn = document.getElementById("open-tab");
    const findReplaceBtn = document.getElementById("find-replace");
    const executeReplaceBtn = document.getElementById("execute-replace");
    
    const jsonInput = document.getElementById("json-input");
    const jsonOutput = document.getElementById("json-output");
    const jsonOutputHighlighted = document.getElementById("json-output-highlighted");
    const validationInfo = document.getElementById("validation-info");
    const findReplaceContainer = document.getElementById("find-replace-container");
    const findText = document.getElementById("find-text");
    const replaceText = document.getElementById("replace-text");
    const outputTabBtn = document.getElementById("output-tab-btn");
    
    // Theme setup - Sync with full editor theme preference
    const savedTheme = localStorage.getItem("jsonbeautifyinator-theme") || "theme-dark";
    document.body.className = savedTheme;

    // Tabs setup
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-tab");
            
            // Toggle active tab buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            // Toggle active panels
            document.querySelectorAll(".tab-panel").forEach(panel => {
                panel.classList.remove("active");
            });
            document.getElementById(targetId).classList.add("active");
        });
    });

    // Real-time input validation helper
    jsonInput.addEventListener("input", validateInput);

    function validateInput() {
        const val = jsonInput.value.trim();
        if (!val) {
            setValidationStatus("success", "Empty input");
            return true;
        }

        try {
            JSON.parse(val);
            setValidationStatus("success", "Valid JSON structure");
            return true;
        } catch (e) {
            setValidationStatus("error", `Invalid JSON: ${e.message}`);
            return false;
        }
    }

    function setValidationStatus(type, message) {
        validationInfo.className = `validation-status ${type === "error" ? "error-msg" : ""}`;
        const dot = validationInfo.querySelector(".status-dot");
        const text = validationInfo.querySelector(".status-text");
        
        dot.className = `status-dot ${type}`;
        text.textContent = message;
    }

    // Format & Minimize Actions
    formatBtn.addEventListener("click", () => {
        processJSON((json) => JSON.stringify(json, null, 2), true);
    });

    minimizeBtn.addEventListener("click", () => {
        processJSON((json) => JSON.stringify(json), false);
    });

    function processJSON(formatter, isBeautify) {
        const input = jsonInput.value.trim();
        if (!input) return;

        try {
            const parsed = JSON.parse(input);
            const formatted = formatter(parsed);
            
            jsonOutput.value = formatted;
            
            if (isBeautify) {
                jsonOutputHighlighted.innerHTML = highlightJSON(formatted);
            } else {
                jsonOutputHighlighted.textContent = formatted;
            }
            
            // Switch to Output Tab
            outputTabBtn.click();
        } catch (e) {
            setValidationStatus("error", `Parse error: ${e.message}`);
        }
    }

    // Custom Highlighting Engine
    function highlightJSON(jsonString) {
        // Escape HTML
        const escaped = jsonString
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Tokenize JSON
        return escaped.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
            (match) => {
                let cls = "syn-number";
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = "syn-key";
                    } else {
                        cls = "syn-string";
                    }
                } else if (/true|false/.test(match)) {
                    cls = "syn-boolean";
                } else if (/null/.test(match)) {
                    cls = "syn-null";
                }
                return `<span class="${cls}">${match}</span>`;
            }
        );
    }

    // Clear Input
    clearBtn.addEventListener("click", () => {
        jsonInput.value = "";
        jsonOutput.value = "";
        jsonOutputHighlighted.textContent = "";
        validateInput();
    });

    // Copy to Clipboard
    copyBtn.addEventListener("click", () => {
        const output = jsonOutput.value;
        if (!output) return;

        navigator.clipboard.writeText(output)
            .then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" width="14" height="14">
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Copied!
                `;
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            })
            .catch(() => {
                alert("Failed to copy JSON.");
            });
    });

    // Download JSON file
    downloadBtn.addEventListener("click", () => {
        const output = jsonOutput.value;
        if (!output) return;

        const blob = new Blob([output], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "formatted.json";
        a.click();
        URL.revokeObjectURL(url);
    });

    // Toggle Find & Replace panel
    findReplaceBtn.addEventListener("click", () => {
        findReplaceContainer.classList.toggle("hidden");
        if (!findReplaceContainer.classList.contains("hidden")) {
            findText.focus();
        }
    });

    // Execute Find & Replace
    executeReplaceBtn.addEventListener("click", () => {
        const pattern = findText.value;
        const replaceVal = replaceText.value;
        const currentVal = jsonOutput.value;

        if (pattern && currentVal) {
            try {
                const regex = new RegExp(pattern, "g");
                const result = currentVal.replace(regex, replaceVal);
                jsonOutput.value = result;
                jsonOutputHighlighted.textContent = result; // Display plain text when manipulated raw
            } catch (e) {
                alert("Invalid Regular Expression pattern");
            }
        }
    });

    // Open Full Editor Page
    openTabBtn.addEventListener("click", () => {
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: "editor.html" });
        } else {
            window.open("editor.html", "_blank");
        }
    });

    // Auto-focus input on open
    jsonInput.focus();
});