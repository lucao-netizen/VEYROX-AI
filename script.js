
"use strict";

/* =========================================
   VEYROX AI — 1.0
   Frontend + Render Backend
   ========================================= */

const API_URL = "https://veyrox-ai.onrender.com/api/chat";

const CHAT_STORAGE = "veyrox_chats_v4";
const SETTINGS_STORAGE = "veyrox_settings_v2";

const MODES = {
  general: {
    label: "✦ Allgemein",
    instruction: "Du bist VEYROX, ein hilfreicher KI-Assistent. Antworte klar, verständlich und präzise."
  },
  writing: {
    label: "✎ Schreiben",
    instruction: "Du bist VEYROX Schreibassistent. Hilf bei Texten, Formulierungen, Ideen und Überarbeitungen."
  },
  coding: {
    label: "⌘ Coding",
    instruction: "Du bist VEYROX Programmierassistent. Schreibe sauberen Code und erkläre Fehler sowie Lösungen verständlich."
  },
  summary: {
    label: "▤ Zusammenfassen",
    instruction: "Du bist VEYROX Zusammenfassungsassistent. Fasse Informationen strukturiert und auf das Wesentliche zusammen."
  }
};

/* ELEMENTS */

const el = {
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),

  chatHistory: document.getElementById("chatHistory"),
  chatArea: document.getElementById("chatArea"),
  messages: document.getElementById("messages"),
  welcome: document.getElementById("welcome"),

  input: document.getElementById("messageInput"),
  send: document.getElementById("sendBtn"),
  newChat: document.getElementById("newChatBtn"),

  themeBtn: document.getElementById("themeBtn"),
  themeIcon: document.getElementById("themeIcon"),
  themeText: document.getElementById("themeText"),

  currentMode: document.getElementById("currentMode")
};

/* STATE */

const state = {
  chats: [],
  currentChatId: null,
  mode: "general",
  busy: false,
  theme: "dark"
};

/* STORAGE */

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE) || "[]");
    if (Array.isArray(saved)) state.chats = saved;
  } catch {
    state.chats = [];
  }

  try {
    const settings = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE) || "{}"
    );
    state.theme = settings.theme || "dark";
  } catch {
    state.theme = "dark";
  }

  applyTheme();
}

function saveChats() {
  try {
    localStorage.setItem(CHAT_STORAGE, JSON.stringify(state.chats));
  } catch (error) {
    console.error("Speicherfehler:", error);
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_STORAGE,
    JSON.stringify({ theme: state.theme })
  );
}

/* CHAT */

function currentChat() {
  return state.chats.find(c => c.id === state.currentChatId) || null;
}

function createChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "Neuer Chat",
    mode: "general",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  state.chats.unshift(chat);
  state.currentChatId = chat.id;
  state.mode = "general";

  saveChats();
  renderChatHistory();
  renderMessages();
  updateModeUI();

  return chat;
}

function ensureChat() {
  return currentChat() || createChat();
}

function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  state.currentChatId = id;
  state.mode = chat.mode || "general";

  renderChatHistory();
  renderMessages();
  updateModeUI();
  closeSidebar();
}

function deleteChat(id) {
  state.chats = state.chats.filter(c => c.id !== id);

  if (state.currentChatId === id) {
    state.currentChatId = null;
  }

  saveChats();
  renderChatHistory();
  renderMessages();
}

function makeTitle(text) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 36 ? clean.slice(0, 36) + "…" : clean;
}

/* SAFE TEXT */

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatMessage(text) {
  let html = escapeHTML(text);

  html = html.replace(
    /```([\w-]*)\n([\s\S]*?)```/g,
    (match, language, code) =>
      `<pre><code class="language-${language}">${code}</code></pre>`
  );

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");

  return html;
}

/* RENDER */

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}-message`;

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = formatMessage(text);

  wrapper.appendChild(content);
  el.messages.appendChild(wrapper);

  scrollToBottom();
}

function renderMessages() {
  el.messages.innerHTML = "";

  const chat = currentChat();
  const hasMessages = !!chat && chat.messages.length > 0;

  el.welcome.style.display = hasMessages ? "none" : "";

  if (!chat) return;

  chat.messages.forEach(message => {
    addMessage(message.role, message.content);
  });
}

function scrollToBottom() {
  el.chatArea.scrollTop = el.chatArea.scrollHeight;
  el.messages.scrollTop = el.messages.scrollHeight;
}

function showTyping() {
  const node = document.createElement("div");
  node.className = "message assistant-message typing-indicator";
  node.innerHTML = `
    <div class="message-content">
      <span></span><span></span><span></span>
    </div>
  `;

  el.messages.appendChild(node);
  scrollToBottom();

  return node;
}

function showError(text) {
  const node = document.createElement("div");
  node.className = "message error-message";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  node.appendChild(content);
  el.messages.appendChild(node);

  scrollToBottom();
}

/* CHAT HISTORY */

function renderChatHistory() {
  el.chatHistory.innerHTML = "";

  state.chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "history-item";

    if (chat.id === state.currentChatId) {
      item.classList.add("active");
    }

    const title = document.createElement("button");
    title.className = "history-title";
    title.textContent = chat.title;
    title.addEventListener("click", () => openChat(chat.id));

    const remove = document.createElement("button");
    remove.className = "history-delete";
    remove.textContent = "×";
    remove.title = "Chat löschen";

    remove.addEventListener("click", event => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    item.append(title, remove);
    el.chatHistory.appendChild(item);
  });
}

/* MODE */

function setMode(mode) {
  if (!MODES[mode]) return;

  state.mode = mode;

  const chat = currentChat();
  if (chat) {
    chat.mode = mode;
    saveChats();
  }

  updateModeUI();
}

function updateModeUI() {
  document.querySelectorAll(".mode-btn").forEach(button => {
    const active = button.dataset.mode === state.mode;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  el.currentMode.textContent = MODES[state.mode].label;
}

/* BACKEND REQUEST */

async function requestAI(message, chat) {
  const history = chat.messages
    .slice(0, -1)
    .slice(-20)
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      content: item.content
    }));

  const payload = {
    message,
    mode: state.mode,
    systemInstruction: MODES[state.mode].instruction,
    history
  };

  console.log("VEYROX: Sende Anfrage an", API_URL);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Ungültige Serverantwort. HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `HTTP ${response.status}`
    );
  }

  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("Backend hat keine KI-Antwort zurückgegeben.");
  }

  return data.reply;
}

/* SEND MESSAGE */

async function sendMessage() {
  if (state.busy) return;

  const text = el.input.value.trim();
  if (!text) return;

  const chat = ensureChat();

  if (chat.messages.length === 0) {
    chat.title = makeTitle(text);
  }

  chat.mode = state.mode;

  chat.messages.push({
    role: "user",
    content: text,
    timestamp: Date.now()
  });

  chat.updatedAt = Date.now();

  saveChats();
  renderChatHistory();

  el.input.value = "";
  el.input.style.height = "auto";
  el.welcome.style.display = "none";

  addMessage("user", text);

  state.busy = true;
  el.send.disabled = true;
  el.input.disabled = true;

  const typing = showTyping();

  try {
    const reply = await requestAI(text, chat);

    typing.remove();

    chat.messages.push({
      role: "assistant",
      content: reply,
      timestamp: Date.now()
    });

    chat.updatedAt = Date.now();

    saveChats();
    addMessage("assistant", reply);

  } catch (error) {
    typing.remove();

    console.error("VEYROX Fehler:", error);

    showError("Anfrage fehlgeschlagen: " + error.message);

  } finally {
    state.busy = false;
    el.input.disabled = false;
    updateSendButton();
  }
}

/* INPUT */

function updateSendButton() {
  el.send.disabled = state.busy || !el.input.value.trim();
}

el.send.addEventListener("click", sendMessage);

el.input.addEventListener("input", () => {
  updateSendButton();

  el.input.style.height = "auto";
  el.input.style.height =
    Math.min(el.input.scrollHeight, 180) + "px";
});

el.input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

/* NEW CHAT */

el.newChat.addEventListener("click", () => {
  state.currentChatId = null;
  createChat();
});

/* MODE BUTTONS */

document.querySelectorAll(".mode-btn").forEach(button => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

/* SUGGESTIONS */

document.querySelectorAll(".suggestion-card").forEach(button => {
  button.addEventListener("click", () => {
    el.input.value = button.dataset.prompt || "";
    updateSendButton();
    el.input.focus();

    // "Hi" wird direkt gesendet, um die KI zu testen.
    if (el.input.value.trim() === "Hi") {
      sendMessage();
    }
  });
});

/* THEME */

function applyTheme() {
  const light = state.theme === "light";

  document.body.classList.toggle("light-mode", light);

  el.themeIcon.textContent = light ? "☀" : "☾";
  el.themeText.textContent = light ? "Dark Mode" : "Design wechseln";
}

el.themeBtn.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveSettings();
});

/* MOBILE SIDEBAR */

function openSidebar() {
  el.sidebar.classList.add("open");
  el.sidebarOverlay.classList.add("active");
}

function closeSidebar() {
  el.sidebar.classList.remove("open");
  el.sidebarOverlay.classList.remove("active");
}

el.mobileMenuBtn.addEventListener("click", openSidebar);
el.sidebarOverlay.addEventListener("click", closeSidebar);

/* INITIALIZE */

loadData();
renderChatHistory();
renderMessages();
updateModeUI();
updateSendButton();

console.log("VEYROX geladen.");
console.log("Backend:", API_URL);
