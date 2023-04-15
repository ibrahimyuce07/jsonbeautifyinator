document.getElementById("format-json").addEventListener("click", formatJSON);
document.getElementById("minimize-json").addEventListener("click", minimizeJSON);
document.getElementById("copy-to-clipboard").addEventListener("click", copyToClipboard);

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
    const output = document.getElementById("json-output");
    output.select();
    output.setSelectionRange(0, 99999);
    document.execCommand("copy");
    changeButtonText("Copied!", 3000);
}

function changeButtonText(text, duration) {
    const button = document.getElementById("copy-to-clipboard");
    const originalText = button.textContent;
    button.textContent = text;

    setTimeout(() => {
        button.textContent = originalText;
    }, duration);
}