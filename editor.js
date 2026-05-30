document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const themeSelect = document.getElementById("theme-select");
    const spacingSelect = document.getElementById("spacing-select");
    const toggleHistoryBtn = document.getElementById("toggle-history");
    const closeHistoryBtn = document.getElementById("close-history");
    const clearHistoryBtn = document.getElementById("clear-history");
    const historySidebar = document.getElementById("history-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const historyListContainer = document.getElementById("history-list-container");
    
    const splitHandle = document.getElementById("split-handle");
    const inputPane = document.getElementById("input-pane");
    const outputPane = document.getElementById("output-pane");
    
    const jsonInput = document.getElementById("json-input");
    const inputLineNumbers = document.getElementById("input-line-numbers");
    const loadSampleBtn = document.getElementById("load-sample");
    const sortKeysBtn = document.getElementById("sort-keys");
    const escapeJsonBtn = document.getElementById("escape-json");
    const unescapeJsonBtn = document.getElementById("unescape-json");
    const clearWorkspaceBtn = document.getElementById("clear-workspace");
    
    const validationAlert = document.getElementById("validation-alert");
    const validationText = document.getElementById("validation-text");
    const charCountEl = document.getElementById("char-count");
    const lineCountEl = document.getElementById("line-count");
    
    const outputLineNumbers = document.getElementById("output-line-numbers");
    const outputHighlighted = document.getElementById("output-highlighted");
    const treeViewRoot = document.getElementById("tree-view-root");
    const treeSearch = document.getElementById("tree-search");
    const treeMatchCount = document.getElementById("tree-match-count");
    const treeExpandAllBtn = document.getElementById("tree-expand-all");
    const treeCollapseAllBtn = document.getElementById("tree-collapse-all");
    
    const outputYaml = document.getElementById("output-yaml");
    const outputXml = document.getElementById("output-xml");
    const outputCsv = document.getElementById("output-csv");
    
    const copyOutputBtn = document.getElementById("copy-output");
    const downloadOutputBtn = document.getElementById("download-output");
    const toastContainer = document.getElementById("toast-container");
    const inputDragZone = document.getElementById("input-drag-zone");

    // --- State Variables ---
    let activeOutputTab = "tab-highlight";
    let isResizing = false;
    let formatHistory = [];
    let parsedJSONObj = null; // Stored parsed object for sub-views

    // --- 1. Settings & Theme Management ---
    function initSettings() {
        const savedTheme = localStorage.getItem("jsonbeautifyinator-theme") || "theme-dark";
        document.body.className = savedTheme;
        themeSelect.value = savedTheme;

        const savedSpacing = localStorage.getItem("jsonbeautifyinator-spacing") || "4";
        spacingSelect.value = savedSpacing;

        const savedSplit = localStorage.getItem("jsonbeautifyinator-split") || "50";
        inputPane.style.width = `${savedSplit}%`;

        // Load History
        const savedHistory = localStorage.getItem("jsonbeautifyinator-history");
        if (savedHistory) {
            try {
                formatHistory = JSON.parse(savedHistory);
                renderHistory();
            } catch (e) {
                formatHistory = [];
            }
        }
    }

    themeSelect.addEventListener("change", (e) => {
        const selectedTheme = e.target.value;
        document.body.className = selectedTheme;
        localStorage.setItem("jsonbeautifyinator-theme", selectedTheme);
        showToast("Theme changed successfully", "success");
    });

    spacingSelect.addEventListener("change", (e) => {
        localStorage.setItem("jsonbeautifyinator-spacing", e.target.value);
        if (jsonInput.value.trim()) {
            beautifyJSON();
        }
    });

    initSettings();

    // --- 2. Split Pane Resizer ---
    splitHandle.addEventListener("mousedown", (e) => {
        isResizing = true;
        splitHandle.classList.add("active");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        
        const containerWidth = document.querySelector(".workspace-main").clientWidth;
        let percentage = (e.clientX / containerWidth) * 100;
        
        // Clamping between 20% and 80%
        percentage = Math.max(20, Math.min(80, percentage));
        
        inputPane.style.width = `${percentage}%`;
        localStorage.setItem("jsonbeautifyinator-split", percentage);
    });

    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            splitHandle.classList.remove("active");
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }
    });

    // --- 3. Scroll Synchronizer & Line Numbers ---
    jsonInput.addEventListener("scroll", () => {
        inputLineNumbers.scrollTop = jsonInput.scrollTop;
    });

    outputHighlighted.addEventListener("scroll", () => {
        outputLineNumbers.scrollTop = outputHighlighted.scrollTop;
    });

    function updateLineNumbers(textarea, gutter) {
        const text = textarea.value || textarea.textContent || "";
        const lineCount = text.split("\n").length;
        
        let gutterHTML = "";
        for (let i = 1; i <= lineCount; i++) {
            gutterHTML += `<div>${i}</div>`;
        }
        gutter.innerHTML = gutterHTML;
    }

    // Dynamic stats and line numbers on input
    jsonInput.addEventListener("input", () => {
        updateStats();
        updateLineNumbers(jsonInput, inputLineNumbers);
        validateInputRealtime();
    });

    function updateStats() {
        const val = jsonInput.value;
        const charCount = val.length;
        const lineCount = val.split("\n").length;
        
        charCountEl.textContent = `${charCount.toLocaleString()} chars`;
        lineCountEl.textContent = `${lineCount.toLocaleString()} lines`;
    }

    // --- 4. JSON Validation & Highlighting ---
    function validateInputRealtime() {
        const input = jsonInput.value.trim();
        if (!input) {
            setValidationBanner("waiting", "Waiting for input...");
            return;
        }

        try {
            JSON.parse(input);
            setValidationBanner("valid", "Valid JSON structure");
        } catch (error) {
            const errDetails = analyzeJsonError(input, error);
            const msg = errDetails.line 
                ? `Error at Line ${errDetails.line}, Col ${errDetails.col}: ${errDetails.message}`
                : `Error: ${error.message}`;
            setValidationBanner("invalid", msg, errDetails);
        }
    }

    function analyzeJsonError(input, error) {
        const message = error.message;
        
        // Search for standard "line X column Y" format
        const lineColMatch = message.match(/at line (\d+) column (\d+)/i);
        if (lineColMatch) {
            return {
                line: parseInt(lineColMatch[1], 10),
                col: parseInt(lineColMatch[2], 10),
                message: message.replace(/at line \d+ column \d+/i, "").trim()
            };
        }

        // Search for position based errors e.g. "at position 42"
        const posMatch = message.match(/at position (\d+)/i);
        if (posMatch) {
            const pos = parseInt(posMatch[1], 10);
            const textBefore = input.substring(0, pos);
            const lines = textBefore.split("\n");
            const line = lines.length;
            const col = lines[lines.length - 1].length + 1;
            return {
                line,
                col,
                message: message.replace(/at position \d+/i, "").trim()
            };
        }

        return { line: null, col: null, message };
    }

    let activeErrorDetails = null;

    function setValidationBanner(status, text, errDetails = null) {
        validationAlert.className = `validation-banner ${status}`;
        validationText.textContent = text;
        activeErrorDetails = errDetails;

        if (status === "invalid") {
            validationAlert.style.cursor = "pointer";
            validationAlert.title = "Click to jump to error location";
        } else {
            validationAlert.style.cursor = "default";
            validationAlert.removeAttribute("title");
        }
    }

    // Click error banner to jump to position
    validationAlert.addEventListener("click", () => {
        if (!activeErrorDetails || !activeErrorDetails.line) return;
        
        const lines = jsonInput.value.split("\n");
        let charIndex = 0;
        
        for (let i = 0; i < activeErrorDetails.line - 1; i++) {
            charIndex += lines[i].length + 1; // +1 for the newline character
        }
        charIndex += (activeErrorDetails.col - 1);

        jsonInput.focus();
        jsonInput.setSelectionRange(charIndex, charIndex + 1);
        
        // Scroll textarea
        const lineHeight = 19.2; // approx height
        jsonInput.scrollTop = (activeErrorDetails.line - 3) * lineHeight;
    });

    // Custom Tokenized Highlighter
    function highlightJSON(jsonString) {
        // Escape HTML tags to prevent XSS injection
        const escaped = jsonString
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Standard tokenizer regex
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

    // --- 5. Beautify & Minimize Processing ---
    function beautifyJSON() {
        const input = jsonInput.value.trim();
        if (!input) return;

        try {
            const parsed = JSON.parse(input);
            parsedJSONObj = parsed; // Save object state

            // Determine spacing
            const spacingVal = spacingSelect.value;
            const indent = spacingVal === "tab" ? "\t" : parseInt(spacingVal, 10);
            
            const formatted = JSON.stringify(parsed, null, indent);
            
            // Output highlighted JSON view
            outputHighlighted.innerHTML = highlightJSON(formatted);
            updateLineNumbers(outputHighlighted, outputLineNumbers);
            
            // Generate Sub-Tab contents
            generateTree();
            generateYAML();
            generateXML();
            generateCSV();

            // Set state to valid
            setValidationBanner("valid", "Valid JSON structure");
            
            // Add to history
            addToHistory(input);
        } catch (error) {
            const errDetails = analyzeJsonError(input, error);
            const msg = errDetails.line 
                ? `Error at Line ${errDetails.line}, Col ${errDetails.col}: ${errDetails.message}`
                : `Error: ${error.message}`;
            setValidationBanner("invalid", msg, errDetails);
            showToast("Parsing failed. Check syntax error.", "error");
        }
    }

    function minimizeJSON() {
        const input = jsonInput.value.trim();
        if (!input) return;

        try {
            const parsed = JSON.parse(input);
            parsedJSONObj = parsed;

            const minimized = JSON.stringify(parsed);
            
            outputHighlighted.textContent = minimized;
            updateLineNumbers(outputHighlighted, outputLineNumbers);
            
            // Clear other sub-tabs since minification applies mainly to formatted JSON text
            generateTree();
            generateYAML();
            generateXML();
            generateCSV();
            
            setValidationBanner("valid", "Minimized JSON generated successfully");
            addToHistory(input);
            showToast("JSON Minimized", "success");
        } catch (error) {
            validateInputRealtime();
            showToast("Parsing failed.", "error");
        }
    }

    // Add keys sorting helper
    function sortObjectKeys(obj) {
        if (obj === null || typeof obj !== "object") {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sortObjectKeys);
        }
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = sortObjectKeys(obj[key]);
        });
        return sorted;
    }

    sortKeysBtn.addEventListener("click", () => {
        const input = jsonInput.value.trim();
        if (!input) return;

        try {
            const parsed = JSON.parse(input);
            const sorted = sortObjectKeys(parsed);
            
            const spacingVal = spacingSelect.value;
            const indent = spacingVal === "tab" ? "\t" : parseInt(spacingVal, 10);
            jsonInput.value = JSON.stringify(sorted, null, indent);
            
            updateLineNumbers(jsonInput, inputLineNumbers);
            updateStats();
            beautifyJSON();
            showToast("Keys sorted alphabetically", "success");
        } catch (e) {
            showToast("Invalid JSON. Cannot sort keys.", "error");
        }
    });

    // Escape strings helper
    escapeJsonBtn.addEventListener("click", () => {
        const val = jsonInput.value;
        if (!val) return;
        
        // Escape quotes and backslashes
        const escaped = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        jsonInput.value = escaped;
        updateLineNumbers(jsonInput, inputLineNumbers);
        updateStats();
        validateInputRealtime();
        showToast("JSON string escaped", "success");
    });

    unescapeJsonBtn.addEventListener("click", () => {
        const val = jsonInput.value;
        if (!val) return;
        
        // Replace escaped quotes and double backslashes
        const unescaped = val.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        jsonInput.value = unescaped;
        updateLineNumbers(jsonInput, inputLineNumbers);
        updateStats();
        validateInputRealtime();
        showToast("JSON string unescaped", "success");
    });

    // Clear Workspace
    clearWorkspaceBtn.addEventListener("click", () => {
        jsonInput.value = "";
        outputHighlighted.textContent = "";
        outputYaml.value = "";
        outputXml.value = "";
        outputCsv.value = "";
        treeViewRoot.innerHTML = '<div class="tree-placeholder">Format standard JSON to browse interactive nodes...</div>';
        
        updateStats();
        updateLineNumbers(jsonInput, inputLineNumbers);
        updateLineNumbers(outputHighlighted, outputLineNumbers);
        setValidationBanner("waiting", "Waiting for input...");
        parsedJSONObj = null;
        showToast("Workspace cleared", "success");
    });

    // Load Sample Button
    loadSampleBtn.addEventListener("click", () => {
        const sample = {
            "name": "JSONBeautifyinator Workspace",
            "version": 2.0,
            "active": true,
            "theme": "glassmorphic-dark",
            "developer": {
                "username": "ibrahimyuce07",
                "profile": "https://github.com/ibrahimyuce07",
                "skills": ["JavaScript", "HTML5", "CSS3", "Chrome Extensions"]
            },
            "features": [
                {
                    "name": "Split Pane Editor",
                    "status": "implemented",
                    "complexity": 3
                },
                {
                    "name": "Interactive Tree View",
                    "status": "implemented",
                    "complexity": 5
                },
                {
                    "name": "YAML/XML/CSV converters",
                    "status": "implemented",
                    "complexity": 4
                }
            ],
            "stats": {
                "downloads": 10500,
                "rating": 4.8,
                "nullField": null
            }
        };

        const spacingVal = spacingSelect.value;
        const indent = spacingVal === "tab" ? "\t" : parseInt(spacingVal, 10);
        jsonInput.value = JSON.stringify(sample, null, indent);
        
        updateStats();
        updateLineNumbers(jsonInput, inputLineNumbers);
        beautifyJSON();
        showToast("Sample JSON loaded", "success");
    });

    // Execute beautify when user clicks tab format buttons or presses Ctrl+Enter
    jsonInput.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            beautifyJSON();
        }
    });

    // Trigger format on paste optionally
    jsonInput.addEventListener("paste", () => {
        // Wait a tick for paste to complete
        setTimeout(() => {
            updateStats();
            updateLineNumbers(jsonInput, inputLineNumbers);
            beautifyJSON();
        }, 50);
    });

    // --- 6. Interactive Tree View Generation ---
    function generateTree() {
        if (parsedJSONObj === null) {
            treeViewRoot.innerHTML = '<div class="tree-placeholder">Format standard JSON to browse interactive nodes...</div>';
            return;
        }

        treeViewRoot.innerHTML = "";
        const ul = document.createElement("ul");
        ul.className = "tree-ul";
        
        const rootNode = createTreeNode("root", parsedJSONObj, "");
        ul.appendChild(rootNode);
        treeViewRoot.appendChild(ul);
    }

    function createTreeNode(key, val, path) {
        const li = document.createElement("li");
        li.className = "tree-li";

        const currentPath = path 
            ? (Array.isArray(val) || !isNaN(key) ? `${path}[${key}]` : `${path}.${key}`)
            : key;

        // Create toggle element
        const toggle = document.createElement("span");
        toggle.className = "tree-toggle";
        li.appendChild(toggle);

        // Key Name
        const keySpan = document.createElement("span");
        keySpan.className = "tree-key";
        keySpan.textContent = isNaN(key) ? `"${key}"` : key;
        li.appendChild(keySpan);

        // Colon separator
        const colon = document.createElement("span");
        colon.className = "tree-colon";
        colon.textContent = ":";
        li.appendChild(colon);

        if (val === null) {
            li.classList.add("leaf");
            const nullSpan = document.createElement("span");
            nullSpan.className = "tree-value type-null";
            nullSpan.textContent = "null";
            li.appendChild(nullSpan);
        } else if (typeof val === "object") {
            li.classList.add("collapsible");
            
            const isArr = Array.isArray(val);
            
            // Meta details (array length or object keys count)
            const meta = document.createElement("span");
            meta.className = "tree-meta";
            meta.textContent = isArr ? `Array[${val.length}]` : `Object{${Object.keys(val).length}}`;
            li.appendChild(meta);

            // Sub List
            const subUl = document.createElement("ul");
            subUl.className = "tree-node hidden";
            
            // Recursively build children
            if (isArr) {
                val.forEach((item, index) => {
                    subUl.appendChild(createTreeNode(index, item, currentPath));
                });
            } else {
                Object.keys(val).forEach(childKey => {
                    subUl.appendChild(createTreeNode(childKey, val[childKey], currentPath));
                });
            }
            li.appendChild(subUl);

            // Toggle Expand/Collapse events
            toggle.addEventListener("click", (e) => {
                e.stopPropagation();
                li.classList.toggle("expanded");
                subUl.classList.toggle("hidden");
            });
            
            // Expand first level by default
            if (path === "") {
                li.classList.add("expanded");
                subUl.classList.remove("hidden");
            }
        } else {
            // Leaf Primitive values
            li.classList.add("leaf");
            const valSpan = document.createElement("span");
            valSpan.className = `tree-value type-${typeof val}`;
            
            if (typeof val === "string") {
                valSpan.textContent = `"${val}"`;
            } else {
                valSpan.textContent = String(val);
            }
            li.appendChild(valSpan);
        }

        // Copy Path Button
        const copyPathBtn = document.createElement("button");
        copyPathBtn.className = "tree-path-copy-btn";
        copyPathBtn.textContent = "Copy Path";
        copyPathBtn.title = `Copy JSON Path: ${currentPath}`;
        copyPathBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(currentPath)
                .then(() => showToast(`Path copied: ${currentPath}`, "success"))
                .catch(() => showToast("Failed to copy path", "error"));
        });
        li.appendChild(copyPathBtn);

        return li;
    }

    // Tree View Global Search & Filter
    treeSearch.addEventListener("input", filterTreeNodes);

    function filterTreeNodes() {
        const query = treeSearch.value.trim().toLowerCase();
        if (!query) {
            // Remove all highlight spans and restore structures
            document.querySelectorAll(".tree-match").forEach(el => {
                const parent = el.parentNode;
                parent.replaceChild(document.createTextNode(el.textContent), el);
            });
            treeMatchCount.textContent = "";
            return;
        }

        let matchCount = 0;

        // Traverse tree leaf values and keys
        const keys = document.querySelectorAll(".tree-key");
        const values = document.querySelectorAll(".tree-value");

        // Helper to highlight matches
        function highlightMatch(element) {
            const text = element.textContent;
            const index = text.toLowerCase().indexOf(query);
            if (index !== -1) {
                matchCount++;
                const before = text.substring(0, index);
                const match = text.substring(index, index + query.length);
                const after = text.substring(index + query.length);
                
                element.innerHTML = `${escapeHtml(before)}<span class="tree-match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
                
                // Automatically expand parents to show the match
                let parent = element.closest(".tree-li");
                while (parent) {
                    parent.classList.add("expanded");
                    const subList = parent.querySelector(".tree-node");
                    if (subList) subList.classList.remove("hidden");
                    parent = parent.parentNode.closest(".tree-li");
                }
            }
        }

        // Clear previous highlights
        document.querySelectorAll(".tree-match").forEach(el => {
            const parent = el.parentNode;
            parent.textContent = parent.textContent; // Resets to text
        });

        keys.forEach(highlightMatch);
        values.forEach(highlightMatch);

        treeMatchCount.textContent = matchCount > 0 ? `${matchCount} matches` : "no matches";
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    treeExpandAllBtn.addEventListener("click", () => {
        document.querySelectorAll(".tree-li.collapsible").forEach(li => {
            li.classList.add("expanded");
            const subNode = li.querySelector(".tree-node");
            if (subNode) subNode.classList.remove("hidden");
        });
    });

    treeCollapseAllBtn.addEventListener("click", () => {
        document.querySelectorAll(".tree-li.collapsible").forEach(li => {
            li.classList.remove("expanded");
            const subNode = li.querySelector(".tree-node");
            if (subNode) subNode.classList.add("hidden");
        });
    });

    // --- 7. Conversions Modules (YAML, XML, CSV) ---
    function generateYAML() {
        if (parsedJSONObj === null) {
            outputYaml.value = "";
            return;
        }
        try {
            outputYaml.value = jsonToYaml(parsedJSONObj);
        } catch (e) {
            outputYaml.value = "Failed to convert JSON to YAML.";
        }
    }

    function generateXML() {
        if (parsedJSONObj === null) {
            outputXml.value = "";
            return;
        }
        try {
            outputXml.value = '<?xml version="1.0" encoding="UTF-8" ?>\n' + jsonToXml(parsedJSONObj);
        } catch (e) {
            outputXml.value = "Failed to convert JSON to XML.";
        }
    }

    function generateCSV() {
        if (parsedJSONObj === null) {
            outputCsv.value = "";
            return;
        }
        try {
            outputCsv.value = jsonToCsv(parsedJSONObj);
        } catch (e) {
            outputCsv.value = "Failed to convert JSON to CSV.\n" + e.message;
        }
    }

    // JSON -> YAML Custom Generator
    function jsonToYaml(obj, indent = 0) {
        const spaces = " ".repeat(indent);
        if (obj === null) return "null";
        if (typeof obj !== "object") {
            if (typeof obj === "string") {
                // If contains newline or quotes, output as block or escape
                if (obj.includes("\n")) {
                    return `|\n${spaces}  ` + obj.split("\n").join(`\n${spaces}  `);
                }
                return `"${obj.replace(/"/g, '\\"')}"`;
            }
            return String(obj);
        }
        if (Array.isArray(obj)) {
            if (obj.length === 0) return "[]";
            return obj.map(item => `${spaces}- ${jsonToYaml(item, indent + 2).trim()}`).join("\n");
        }
        const keys = Object.keys(obj);
        if (keys.length === 0) return "{}";
        return keys.map(key => {
            const val = obj[key];
            const formattedVal = jsonToYaml(val, indent + 2);
            const safeKey = key.includes(" ") || key.includes(":") ? `"${key}"` : key;
            
            if (val !== null && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length > 0) {
                return `${spaces}${safeKey}:\n${formattedVal}`;
            }
            if (Array.isArray(val) && val.length > 0) {
                return `${spaces}${safeKey}:\n${formattedVal}`;
            }
            return `${spaces}${safeKey}: ${formattedVal}`;
        }).join("\n");
    }

    // JSON -> XML Custom Generator
    function jsonToXml(obj, rootName = "root", indent = 0) {
        const spaces = " ".repeat(indent);
        let xml = "";
        
        if (obj === null) {
            return `${spaces}<${rootName} />`;
        }
        if (typeof obj !== "object") {
            return `${spaces}<${rootName}>${escapeXml(String(obj))}</${rootName}>`;
        }
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                xml += jsonToXml(item, "item", indent) + "\n";
            });
            return xml.trimEnd();
        }
        
        for (const key in obj) {
            const val = obj[key];
            const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_") || "key";
            if (Array.isArray(val)) {
                val.forEach(item => {
                    xml += jsonToXml(item, safeKey, indent) + "\n";
                });
            } else if (typeof val === "object" && val !== null) {
                xml += `${spaces}<${safeKey}>\n${jsonToXml(val, "", indent + 2)}\n${spaces}</${safeKey}>\n`;
            } else {
                xml += `${spaces}<${safeKey}>${escapeXml(String(val))}</${safeKey}>\n`;
            }
        }
        
        if (rootName) {
            return `${spaces}<${rootName}>\n${xml.trimEnd()}\n${spaces}</${rootName}>`;
        }
        return xml.trimEnd();
    }

    function escapeXml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&apos;");
    }

    // JSON -> CSV Custom Generator
    function jsonToCsv(json) {
        let data = json;
        if (!Array.isArray(data)) {
            if (typeof data === "object" && data !== null) {
                data = [data];
            } else {
                return "Value\n" + String(data);
            }
        }
        if (data.length === 0) return "";
        
        function flattenObj(obj, parent = '', res = {}) {
            for (let key in obj) {
                let propName = parent ? parent + '_' + key : key;
                if (typeof obj[key] == 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    flattenObj(obj[key], propName, res);
                } else {
                    res[propName] = obj[key];
                }
            }
            return res;
        }

        const flattenedData = data.map(item => {
            if (typeof item === "object" && item !== null) {
                return flattenObj(item);
            }
            return { value: item };
        });

        const headers = Array.from(new Set(flattenedData.flatMap(item => Object.keys(item))));
        const csvRows = [];
        
        // Header
        csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","));
        
        // Rows
        flattenedData.forEach(row => {
            const values = headers.map(header => {
                const val = row[header];
                if (val === undefined || val === null) return '""';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(","));
        });
        
        return csvRows.join("\n");
    }

    // --- 8. Tab Navigation (Output Pane) ---
    const outputTabButtons = document.querySelectorAll(".output-tab-btn");
    outputTabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const tabId = button.getAttribute("data-output-tab");
            
            outputTabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            document.querySelectorAll(".output-tab-panel").forEach(panel => {
                panel.classList.remove("active");
            });
            document.getElementById(tabId).classList.add("active");
            
            activeOutputTab = tabId;
        });
    });

    // --- 9. File Loading & Drag-and-Drop ---
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        inputDragZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone
    ['dragenter', 'dragover'].forEach(eventName => {
        inputDragZone.addEventListener(eventName, () => inputDragZone.classList.add('dragging'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        inputDragZone.addEventListener(eventName, () => inputDragZone.classList.remove('dragging'), false);
    });

    // Handle dropped files
    inputDragZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                jsonInput.value = event.target.result;
                updateStats();
                updateLineNumbers(jsonInput, inputLineNumbers);
                beautifyJSON();
                showToast(`Loaded ${file.name} successfully`, "success");
            };
            reader.readAsText(file);
        }
    });

    // --- 10. Copy and Download Outputs ---
    copyOutputBtn.addEventListener("click", () => {
        let content = "";
        
        switch (activeOutputTab) {
            case "tab-highlight":
                // Copy formatted output (use standard stringify to avoid span HTML tags copy)
                if (parsedJSONObj) {
                    const spacingVal = spacingSelect.value;
                    const indent = spacingVal === "tab" ? "\t" : parseInt(spacingVal, 10);
                    content = JSON.stringify(parsedJSONObj, null, indent);
                } else {
                    content = outputHighlighted.textContent;
                }
                break;
            case "tab-yaml":
                content = outputYaml.value;
                break;
            case "tab-xml":
                content = outputXml.value;
                break;
            case "tab-csv":
                content = outputCsv.value;
                break;
            case "tab-tree":
                if (parsedJSONObj) {
                    content = JSON.stringify(parsedJSONObj, null, 2);
                }
                break;
        }

        if (!content) {
            showToast("No content to copy!", "error");
            return;
        }

        navigator.clipboard.writeText(content)
            .then(() => {
                showToast("Copied to clipboard!", "success");
            })
            .catch(() => {
                showToast("Failed to copy", "error");
            });
    });

    downloadOutputBtn.addEventListener("click", () => {
        let content = "";
        let filename = "export";
        
        switch (activeOutputTab) {
            case "tab-highlight":
            case "tab-tree":
                if (parsedJSONObj) {
                    content = JSON.stringify(parsedJSONObj, null, 4);
                } else {
                    content = outputHighlighted.textContent;
                }
                filename += ".json";
                break;
            case "tab-yaml":
                content = outputYaml.value;
                filename += ".yaml";
                break;
            case "tab-xml":
                content = outputXml.value;
                filename += ".xml";
                break;
            case "tab-csv":
                content = outputCsv.value;
                filename += ".csv";
                break;
        }

        if (!content) {
            showToast("No content to download!", "error");
            return;
        }

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${filename}`, "success");
    });

    // --- 11. Format History System ---
    function addToHistory(fullText) {
        // Prevent duplicate entries of the same string consecutively
        if (formatHistory.length > 0 && formatHistory[0].fullText === fullText) {
            return;
        }

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const snippet = fullText.substring(0, 80).replace(/\s+/g, " ") + (fullText.length > 80 ? "..." : "");
        
        const historyItem = {
            id: Date.now(),
            timestamp: time,
            snippet,
            fullText
        };

        formatHistory.unshift(historyItem);
        
        // Keep last 10 items
        if (formatHistory.length > 10) {
            formatHistory.pop();
        }

        localStorage.setItem("jsonbeautifyinator-history", JSON.stringify(formatHistory));
        renderHistory();
    }

    function renderHistory() {
        if (formatHistory.length === 0) {
            historyListContainer.innerHTML = '<div class="history-empty">No formatted history yet.</div>';
            return;
        }

        historyListContainer.innerHTML = "";
        formatHistory.forEach(item => {
            const div = document.createElement("div");
            div.className = "history-item";
            div.innerHTML = `
                <div class="history-meta">
                    <span>Formatted Entry</span>
                    <span>${item.timestamp}</span>
                </div>
                <div class="history-snippet">${escapeHtml(item.snippet)}</div>
            `;
            
            div.addEventListener("click", () => {
                jsonInput.value = item.fullText;
                updateStats();
                updateLineNumbers(jsonInput, inputLineNumbers);
                beautifyJSON();
                closeHistory();
                showToast("Restored from history", "success");
            });
            
            historyListContainer.appendChild(div);
        });
    }

    function openHistory() {
        historySidebar.classList.add("open");
        sidebarBackdrop.classList.add("active");
    }

    function closeHistory() {
        historySidebar.classList.remove("open");
        sidebarBackdrop.classList.remove("active");
    }

    toggleHistoryBtn.addEventListener("click", openHistory);
    closeHistoryBtn.addEventListener("click", closeHistory);
    sidebarBackdrop.addEventListener("click", closeHistory);

    clearHistoryBtn.addEventListener("click", () => {
        formatHistory = [];
        localStorage.removeItem("jsonbeautifyinator-history");
        renderHistory();
        showToast("History cleared", "success");
    });

    // --- 12. Toast Messaging System ---
    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        const checkIcon = `
            <svg viewBox="0 0 24 24" width="16" height="16" style="color: var(--success-text);">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        `;
        
        const errIcon = `
            <svg viewBox="0 0 24 24" width="16" height="16" style="color: var(--error-text);">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
        `;

        toast.innerHTML = `
            ${type === "success" ? checkIcon : errIcon}
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after 3s
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            toast.style.transition = "opacity 0.3s, transform 0.3s";
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2500);
    }
});
