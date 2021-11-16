const codeEditor = ace.edit("codeEditor");
const modeList = ace.require("ace/ext/modelist");

const modeSelect = document.getElementById("modeSelect");
const tabSizeSelect = document.getElementById("tabSizeSelect");
const fontSizeSelect = document.getElementById("fontSizeInput");
const themeSelect = document.getElementById("themeSelect");

const shareInput = document.getElementById("shareInput");

const downloadButton = document.getElementById("downloadButton");

onDocumentReady(function () {
  shareInput.value = window.location.href;
});

modeSelect.addEventListener("change", function (event) {
  setCodeEditorOption("mode", event.target.value);
});

tabSizeSelect.addEventListener("change", function (event) {
  setCodeEditorOption("tabSize", event.target.value);
});

fontSizeSelect.addEventListener("change", function (event) {
  setCodeEditorOption("fontSize", event.target.value);
});

themeSelect.addEventListener("change", function (event) {
  setCodeEditorOption("theme", event.target.value);
});

downloadButton.addEventListener("click", function (event) {
  const content = codeEditor.getValue();
  const extension = getExtentionForMode();
  const filename = `myfile.${extension}`;
  saveFile(content, filename, 'text/plain');
});

function initCodeEditor() {
  codeEditor.setOptions({
    mode: 'ace/mode/javascript',
    tabSize: 4,
    fontSize: 14,
    theme: "ace/theme/monokai",
    value: `console.log("Hello World!");`
  })
}

function setCodeEditorOption(key, value) {
  let finalValue = null;
  if (key === "fontSize" || key === "tabSize") {
    finalValue = parseInt(value)
  } else {
    finalValue = value;
  }
  codeEditor.setOption(key, finalValue);
}

function getExtentionForMode() {
  let result = "txt";
  const mode = codeEditor.getOption("mode");
  const modeItem = modeList.modes.find(function (item) { return item.mode === mode; });
  if (modeItem) {
    result = modeItem.extensions.split("|")[0];
  }
  return result;
}

function saveFile(text, name, type) {
  var a = document.createElement("a");
  var file = new Blob([text], { type: type });
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}

function onDocumentReady(fn) {
  if (document.readyState != 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

initCodeEditor();
