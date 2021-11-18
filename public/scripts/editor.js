const codeEditor = ace.edit("codeEditor");
const modeList = ace.require("ace/ext/modelist");

const socket = io();

onDocumentReady(() => {
  const modeSelect = document.getElementById("modeSelect");
  const tabSizeSelect = document.getElementById("tabSizeSelect");
  const fontSizeInput = document.getElementById("fontSizeInput");
  const themeSelect = document.getElementById("themeSelect");

  const downloadButton = document.getElementById("downloadButton");;
  const copyButton = document.getElementById("copyButton");;
  const joinButton = document.getElementById("joinButton");;
  const chatButton = document.getElementById("chatButton");

  const toastContainer = document.getElementById("toastContainer");
  const chatContainer = document.getElementById("chatContainer");

  const shareInput = document.getElementById("shareInput");
  const chatInput = document.getElementById("chatInput");
  const usernameInput = document.getElementById("usernameInput");
  const usernameError = document.getElementById("usernameError");

  const unreadMessageCount = document.getElementById("unreadMessageCount");
  const activePeopleCount = document.getElementById("activePeopleCount");
  const activePeopleList = document.getElementById("activePeopleList");

  const chatDrawer = document.getElementById("chatDrawer");

  const joinModal = document.getElementById("joinModal");
  const shareModal = document.getElementById("shareModal");

  const JoinModal = bootstrap.Modal.getOrCreateInstance(joinModal);
  const ShareModal = bootstrap.Modal.getOrCreateInstance(shareModal);

  codeEditor.setOptions({
    mode: "ace/mode/javascript",
    tabSize: 4,
    fontSize: 14,
    theme: "ace/theme/monokai",
    value: `console.log("Hello World!");`
  })

  let prevCode = "";

  codeEditor.on("change", debounce(() => {
    const code = codeEditor.getValue();
    if (code === prevCode) {
      prevCode = code;
      return;
    }
    socket.emit("updateCode", code);
    prevCode = code;
  }, 1500));

  modeSelect.addEventListener("change", (event) => {
    setCodeEditorOption("mode", event.target.value);
  });

  tabSizeSelect.addEventListener("change", (event) => {
    setCodeEditorOption("tabSize", event.target.value);
  });

  fontSizeInput.addEventListener("change", (event) => {
    setCodeEditorOption("fontSize", event.target.value);
  });

  themeSelect.addEventListener("change", (event) => {
    setCodeEditorOption("theme", event.target.value);
  });

  downloadButton.addEventListener("click", () => {
    const content = codeEditor.getValue();
    const extension = getFileExtention();
    const filename = `myfile.${extension}`;
    saveFile(content, filename, "text/plain");
  });

  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(shareInput.value);
    showToast("Link copied to clipboard!", toastContainer);
    ShareModal.hide();
  });

  joinButton.addEventListener("click", () => {
    const payload = {
      room: shareInput.value.split("/")[4],
      name: usernameInput.value.trim()
    };

    socket.emit("join", payload, (error) => {
      if (error) {
        usernameInput.classList.add("is-invalid");
        usernameError.innerHTML = error;
      } else {
        JoinModal.hide();
      }
    });
  });

  shareInput.value = window.location.href;

  chatInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      chatButton.click();
    }
  });

  chatButton.addEventListener("click", () => {
    const username = usernameInput.value;
    const message = chatInput.value;
    const messageHTML = createChatBubble(username, message, "right");
    chatContainer.innerHTML += messageHTML;
    chatContainer.scrollTo({ top: chatContainer.scrollHeight });
    socket.emit("sendMessage", message);
  });

  chatDrawer.addEventListener("shown.bs.offcanvas", () => {
    unreadMessageCount.hidden = true;
    unreadMessageCount.textContent = "0";
  });

  socket.on("peopleChange", (users) => {
    activePeopleCount.innerHTML = users.length;
    activePeopleList.innerHTML = createPeopleList(users);
  });

  socket.on("message", ({ username, message }) => {
    if (chatDrawer.style.visibility !== "visible") {
      unreadMessageCount.hidden = false;
      unreadMessageCount.textContent = Number.parseInt(unreadMessageCount.textContent) + 1;
    }
    const bubbleHTML = createChatBubble(username, message, "left")
    chatContainer.innerHTML += bubbleHTML;
    chatContainer.scrollTo({ top: chatContainer.scrollHeight });
  });

  socket.on("codeChange", (code) => {
    const currentCursorPosition = codeEditor.getCursorPositionScreen();
    codeEditor.setValue(code, currentCursorPosition);
  });

  socket.on("notification", (message) => {
    showToast(message, toastContainer);
  });

  JoinModal.show();
});

function setCodeEditorOption(key, value) {
  let finalValue = null;
  if (key === "fontSize" || key === "tabSize") {
    finalValue = parseInt(value)
  } else {
    finalValue = value;
  }
  codeEditor.setOption(key, finalValue);
}

function getFileExtention() {
  let extention = "txt";
  const modeValue = codeEditor.getOption("mode");
  const modeItem = modeList.modes.find((item) => item.mode === modeValue);
  if (modeItem) {
    extention = modeItem.extensions.split("|")[0];
  }
  return extention;
}

function saveFile(text, name, type) {
  var a = document.createElement("a");
  var file = new Blob([text], { type: type });
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}

function showToast(message, container) {
  const toastHTML = createToast(message);
  const toastEl = createHTMLElement(toastHTML);
  container.append(toastEl);
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2000 });
  toast.show();
  setTimeout(() => {
    toast.dispose();
    toastEl.remove();
  }, 3000);
}

function createToast(message) {
  return `
    <div role="alert" aria-live="assertive" aria-atomic="true" class="toast">
      <div class="toast-body">${message}</div>
    </div>
  `;
}

function createChatBubble(username, message, type = "right") {
  const date = new Date();
  const time = date.toLocaleString("en-US", { hour: "numeric", minute: "numeric", hour12: true });
  return `
    <div class="chat-bubble chat-bubble-${type} px-3 py-1">
      <div class="text-left"><small class="text-muted">~${username}</small></div>
      <div class="text-left">${message}</div>
      <div class="text-left"><small class="text-muted">${time}</small></div>
    </div>
  `;
}

function createPeopleList(users) {
  let html = "";
  for (let i = 0; i < users.length; i++) {
    html += `
      <li class="list-group-item list-group-item-action">
        ${users[i].name}
      </li>
    `;
  }
  return html;
}

function createHTMLElement(html) {
  const template = document.createElement("template");
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}

function debounce(func, delay) {
  let debounceTimer;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  }
}

function onDocumentReady(fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
