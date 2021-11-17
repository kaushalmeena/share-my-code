const codeEditor = ace.edit("codeEditor");
const modeList = ace.require("ace/ext/modelist");

const socket = io();

onDocumentReady(() => {
  initCodeEditor();

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

  document.getElementById("shareInput").value = window.location.href;

  document
    .getElementById("modeSelect")
    .addEventListener("change", (event) => {
      setCodeEditorOption("mode", event.target.value);
    });

  document
    .getElementById("tabSizeSelect")
    .addEventListener("change", (event) => {
      setCodeEditorOption("tabSize", event.target.value);
    });

  document
    .getElementById("fontSizeInput")
    .addEventListener("change", (event) => {
      setCodeEditorOption("fontSize", event.target.value);
    });

  document
    .getElementById("themeSelect")
    .addEventListener("change", (event) => {
      setCodeEditorOption("theme", event.target.value);
    });

  document
    .getElementById("downloadButton")
    .addEventListener("click", () => {
      const content = codeEditor.getValue();
      const extension = getExtentionForMode();
      const filename = `myfile.${extension}`;
      saveFile(content, filename, 'text/plain');
    });

  const toastContainer = document.getElementById("toastContainer");

  document
    .getElementById("copyButton")
    .addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href);
      createToast("Link copied to clilpboard!", toastContainer);
    });

  const JoinModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("joinModal"));

  const usernameInput = document.getElementById("usernameInput");
  const usernameError = document.getElementById("usernameError");

  document
    .getElementById("joinButton")
    .addEventListener("click", () => {
      const payload = {
        room: window.location.href.split("/")[4],
        name: usernameInput.value
      };

      socket.emit('join', payload, (error) => {
        if (error) {
          usernameInput.classList.add("is-invalid");
          usernameError.innerHTML = error;
        } else {
          JoinModal.hide();
        }
      });
    });

  const chatContainer = document.getElementById("chatContainer");
  const chatInput = document.getElementById("chatInput");
  const sendButton = document.getElementById("sendButton");

  chatInput.addEventListener("keypress", (event) => {
    if (event.which == 13) {
      sendButton.click();
    }
  });

  sendButton.addEventListener("click", () => {
    const user = usernameInput.value;
    const message = chatInput.value;
    const messageHTML = createChatMessage(user, message, "right");
    socket.emit("sendMessage", message);
    chatContainer.innerHTML += messageHTML;
    chatContainer.scrollTo({ top: chatContainer.scrollHeight });
  });

  const offCanvasChat = document.getElementById("offCanvasChat");
  const messageCount = document.getElementById("messageCount");

  offCanvasChat.addEventListener('shown.bs.offcanvas', function () {
    messageCount.hidden = true;
    messageCount.textContent = "0";
  });

  const peopleCount = document.getElementById("peopleCount");
  const peopleList = document.getElementById("peopleList");

  socket.on('peopleChange', (users) => {
    peopleCount.innerHTML = users.length;
    peopleList.innerHTML = createPeopleList(users);
  });

  socket.on('message', ({ username, message }) => {
    if (offCanvasChat.style.visibility !== "visible") {
      messageCount.hidden = false;
      messageCount.textContent = Number.parseInt(messageCount.textContent) + 1;
    }
    const messageHTML = createChatMessage(username, message, "left")
    chatContainer.innerHTML += messageHTML;
    chatContainer.scrollTo({ top: chatContainer.scrollHeight });
  });

  socket.on('codeChange', ({ code }) => {
    codeEditor.setValue(code, -1);
  });

  socket.on('notification', ({ message }) => {
    createToast(message, toastContainer);
  });

  JoinModal.show();
});


function initCodeEditor() {
  codeEditor.setOptions({
    mode: 'ace/mode/javascript',
    tabSize: 4,
    fontSize: 14,
    theme: 'ace/theme/monokai',
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
  let extention = "txt";
  const modeValue = codeEditor.getOption("mode");
  const modeItem = modeList.modes.find(function (item) {
    return item.mode === modeValue;
  });
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

function createToast(message, container) {
  const toastEl = createHTMLElement(`
    <div role="alert" aria-live="assertive" aria-atomic="true" class="toast">
      <div class="toast-body">${message}</div>
    </div>
  `);
  container.append(toastEl);
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2000 });
  toast.show();
  setTimeout(() => {
    toast.dispose();
    toastEl.remove();
  }, 3000)
}

function createChatMessage(username, message, type) {
  var date = new Date();
  var time = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  if (type === "right") {
    return `
    <div class="bubble bubble-right px-3 py-1">
      <div class="text-left"><small class="text-muted">~${username}</small></div>
      <div class="text-left">${message}</div>
      <div class="text-left"><small class="text-muted">${time}</small></div>
    </div>
  `;
  }
  return `
    <div class="bubble bubble-left px-3 py-1">
      <div class="text-left"><small class="text-muted">~${username}</small></div>
      <div class="text-left">${message}</div>
      <div class="text-left"><small class="text-muted">${time}</small></div>
    </div>
  `;
}

function createPeopleList(users) {
  let html = "";
  for (let i = 0; i < users.length; i++) {
    html += ` <li class="list-group-item list-group-item-action">${users[i].name}</li>`;
  }
  return html;
}

function createHTMLElement(html) {
  const template = document.createElement('template');
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}

function debounce(func, delay) {
  let debounceTimer
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  }
}

function onDocumentReady(fn) {
  if (document.readyState != 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}
