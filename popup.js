document.getElementById("format-json").addEventListener("click", formatJSON);
document.getElementById("minimize-json").addEventListener("click", minimizeJSON);
document.getElementById("copy-to-clipboard").addEventListener("click", copyToClipboard);
document.getElementById("download-json").addEventListener("click", downloadJSON);
// Disabled Tree View functionality
// document.getElementById("show-tree-view").addEventListener("click", toggleTreeView);
document.getElementById("find-replace").addEventListener("click", toggleFindReplace);
document.getElementById("execute-replace").addEventListener("click", executeReplace);

// Prevent popup from closing automatically
document.querySelector(".container").addEventListener("mousedown", (e) => {
    e.stopPropagation();
});

document.querySelector(".container").addEventListener("mouseup", (e) => {
    e.stopPropagation();
});

function formatJSON() {
    processJSON((json) => JSON.stringify(json, null, 2));
}

function minimizeJSON() {
    processJSON((json) => JSON.stringify(json));
}

function processJSON(processor) {
    const input = document.getElementById("json-input").value.trim();
    const output = document.getElementById("json-output");

    try {
        const json = JSON.parse(input);
        const result = processor(json);
        output.value = result;
    } catch (error) {
        output.value = "Invalid JSON. Please check your input.";
    }
}

function copyToClipboard() {
    const output = document.getElementById("json-output").value;
    navigator.clipboard.writeText(output)
        .then(() => {
            changeButtonText("Copied!", 3000);
        })
        .catch(() => {
            alert("Failed to copy text to clipboard.");
        });
}

function changeButtonText(text, duration) {
    const button = document.getElementById("copy-to-clipboard");
    const originalText = button.textContent;
    button.textContent = text;

    setTimeout(() => {
        button.textContent = originalText;
    }, duration);
}

function downloadJSON() {
    const output = document.getElementById("json-output").value;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.json";
    a.click();
    URL.revokeObjectURL(url);
}

function toggleFindReplace() {
    const container = document.getElementById("find-replace-container");
    container.classList.toggle("hidden");
}

function executeReplace() {
    const findText = document.getElementById("find-text").value;
    const replaceText = document.getElementById("replace-text").value;
    const input = document.getElementById("json-input").value;
    const output = document.getElementById("json-output");

    if (findText) {
        const regex = new RegExp(findText, "g");
        const updatedInput = input.replace(regex, replaceText);
        output.value = updatedInput; // Display result in the output textarea
    }
}

// Removed resizing functionality
document.querySelector(".container").style.resize = "none";
document.querySelector(".container").style.overflow = "hidden";

// Removed close button functionality
document.getElementById("close-popup").remove();

// Override Ctrl+F behavior to search within the popup
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        document.getElementById("find-text").focus();
    }
});