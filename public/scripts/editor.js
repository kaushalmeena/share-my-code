const codeEditor = ace.edit("codeEditor");
const modeList = ace.require("ace/ext/modelist");
// eslint-disable-next-line no-unused-vars
const languageTools = ace.require("ace/ext/language_tools");

const socket = io();

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

function handleCodeEditorChange() {
  let prevCode = "";

  return debounce(() => {
    const code = codeEditor.getValue();
    if (code === prevCode) {
      return;
    }
    socket.emit("updateCode", code);
    prevCode = code;
  }, 1500);
}

function getFileExtention() {
  let extention = "txt";
  const modeValue = codeEditor.getOption("mode");
  const modeItem = modeList.modes.find((item) => item.mode === modeValue);
  if (modeItem) {
    [extention] = modeItem.extensions.split("|");
  }
  return extention;
}

function saveFile(text, name, type) {
  const a = document.createElement("a");
  const file = new Blob([text], { type });
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}

function createToast(message) {
  return `
    <div role="alert" aria-live="assertive" aria-atomic="true" class="toast">
      <div class="toast-body">${message}</div>
    </div>
  `;
}

function createHTMLElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

function showToast(message, container) {
  const toastHTML = createToast(message);
  const toastEl = createHTMLElement(toastHTML);
  const Toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2000 });
  container.append(toastEl);
  Toast.show();
  toastEl.addEventListener(
    "hidden.bs.toast",
    () => {
      toastEl.remove();
    },
    { once: true }
  );
}

function createChatMessage(username, message, type = "right") {
  const date = new Date();
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true
  });
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
  for (let i = 0; i < users.length; i += 1) {
    html += `
      <li class="list-group-item list-group-item-action">
        ${users[i].name}
      </li>
    `;
  }
  return html;
}

function onDocumentReady(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

onDocumentReady(() => {
  const modeSelect = document.getElementById("modeSelect");
  const tabSizeSelect = document.getElementById("tabSizeSelect");
  const fontSizeInput = document.getElementById("fontSizeInput");
  const themeSelect = document.getElementById("themeSelect");

  const downloadButton = document.getElementById("downloadButton");
  const copyButton = document.getElementById("copyButton");
  const joinButton = document.getElementById("joinButton");
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
    value: 'console.log("Hello World!");',
    enableBasicAutocompletion: true,
    enableSnippets: false,
    enableLiveAutocompletion: true
  });

  codeEditor.on("change", handleCodeEditorChange());

  modeSelect.onchange = (event) => {
    codeEditor.setOption("mode", event.target.value);
  };

  tabSizeSelect.onchange = (event) => {
    codeEditor.setOption("tabSize", +event.target.value);
  };

  fontSizeInput.onchange = (event) => {
    codeEditor.setOption("fontSize", +event.target.value);
  };

  themeSelect.onchange = (event) => {
    codeEditor.setOption("theme", event.target.value);
  };

  downloadButton.onclick = () => {
    const content = codeEditor.getValue();
    const extension = getFileExtention();
    const filename = `myfile.${extension}`;
    saveFile(content, filename, "text/plain");
  };

  copyButton.onclick = () => {
    navigator.clipboard
      .writeText(shareInput.value)
      .then(() => {
        showToast("Link copied to clipboard!", toastContainer);
      })
      .catch(() => {
        showToast("Could not copy text!", toastContainer);
      })
      .finally(() => {
        ShareModal.hide();
      });
  };

  joinButton.onclick = () => {
    const payload = {
      room: shareInput.dataset.room,
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
  };

  shareInput.value = window.location.href;

  chatInput.onkeydown = (event) => {
    if (event.key === "Enter") {
      chatButton.click();
    }
  };

  chatButton.onclick = () => {
    const username = usernameInput.value;
    const message = chatInput.value;
    const messageHTML = createChatMessage(username, message, "right");
    chatContainer.innerHTML += messageHTML;
    chatContainer.scrollTo({ top: chatContainer.scrollHeight });
    socket.emit("sendMessage", message);
  };

  chatDrawer.addEventListener("shown.bs.offcanvas", () => {
    unreadMessageCount.hidden = true;
    unreadMessageCount.textContent = "0";
  });

  socket.on("usersChange", (users) => {
    activePeopleCount.innerHTML = users.length;
    activePeopleList.innerHTML = createPeopleList(users);
  });

  socket.on("message", ({ username, message }) => {
    if (chatDrawer.style.visibility !== "visible") {
      unreadMessageCount.hidden = false;
      unreadMessageCount.textContent =
        Number.parseInt(unreadMessageCount.textContent, 10) + 1;
    }
    const messageHTML = createChatMessage(username, message, "left");
    chatContainer.innerHTML += messageHTML;
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
