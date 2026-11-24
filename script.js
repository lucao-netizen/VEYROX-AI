
"use strict";

/* ==========================================
   VEYROX AI — FRONTEND
   Backend: Render
   ========================================== */

const API_URL = "https://veyrox-ai.onrender.com/api/chat";
const STORAGE_KEY = "veyrox_chats_v2";
const SETTINGS_KEY = "veyrox_settings_v2";

const MODES = {
  general: {
    name: "Allgemein",
    instruction: "Du bist VEYROX, ein hilfreicher, intelligenter KI-Assistent. Antworte verständlich, präzise und in der Sprache des Nutzers."
  },
  writing: {
    name: "Schreiben",
    instruction: "Du bist VEYROX, ein professioneller Schreibassistent. Hilf beim Schreiben, Überarbeiten, Formulieren und Verbessern von Texten."
  },
  coding: {
    name: "Programmieren",
    instruction: "Du bist VEYROX, ein technischer Programmierassistent. Erkläre Code verständlich, liefere korrekte Lösungen und achte auf Fehler."
  },
  summary: {
    name: "Zusammenfassen",
    instruction: "Du bist VEYROX, ein Zusammenfassungsassistent. Fasse Inhalte strukturiert, verständlich und auf das Wesentliche konzentriert zusammen."
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  mode: "general",
  chats: [],
  currentChatId: null,
  busy: false,
  settings: {
    theme: "dark"
  }
};

/* ---------- DOM ELEMENTS ---------- */

const input =
  $("#messageInput") ||
  $("#chatInput") ||
  $("#promptInput") ||
  $("textarea");

const sendButton =
  $("#sendButton") ||
  $("#sendBtn") ||
  $("#submitButton") ||
  $('[type="submit"]');

const messagesContainer =
  $("#messagesContainer") ||
  $("#chatMessages") ||
  $("#messages") ||
  $(".messages");

const chatList =
  $("#chatHistory") ||
  $("#chatList") ||
  $("#historyList");

const newChatButton =
  $("#newChatButton") ||
  $("#newChatBtn") ||
  $("#newChat");

const modeButtons = $$("[data-mode]");

/* ---------- STORAGE ---------- */

function loadStorage() {
  try {
    const chats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(chats)) state.chats = chats;
  } catch {
    state.chats = [];
  }

  try {
    const settings = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    state.settings = { ...state.settings, ...settings };
  } catch {}

  if (state.settings.theme === "light") {
    document.body.classList.add("light-mode");
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chats));
  } catch (error) {
    console.error("VEYROX: Chats konnten nicht gespeichert werden", error);
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

/* ---------- CHAT MANAGEMENT ---------- */

function createChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "Neuer Chat",
    mode: state.mode,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  state.chats.unshift(chat);
  state.currentChatId = chat.id;

  saveChats();
  renderChatList();
  renderMessages();

  return chat;
}

function getCurrentChat() {
  return state.chats.find(
    chat => chat.id === state.currentChatId
  );
}

function ensureChat() {
  return getCurrentChat() || createChat();
}

function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  state.currentChatId = id;
  state.mode = chat.mode || "general";

  updateModeButtons();
  renderMessages();
  renderChatList();
}

function deleteChat(id) {
  state.chats = state.chats.filter(c => c.id !== id);

  if (state.currentChatId === id) {
    state.currentChatId = null;
  }

  saveChats();
  renderChatList();
  renderMessages();
}

function renameChat(id, title) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  chat.title = title.trim() || "Neuer Chat";
  saveChats();
  renderChatList();
}

function generateTitle(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 36 ? clean.slice(0, 36) + "…" : clean;
}

/* ---------- MESSAGE RENDERING ---------- */

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
  let safe = escapeHTML(text);

  // Code blocks
  safe = safe.replace(
    /```([\w+-]*)\n([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre><code class="language-${lang}">${code}</code></pre>`
  );

  // Inline code
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Basic Markdown
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

function addMessageToUI(role, content) {
  if (!messagesContainer) {
    console.error("VEYROX: Nachrichtencontainer nicht gefunden.");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}-message`;

  const bubble = document.createElement("div");
  bubble.className = "message-content";
  bubble.innerHTML = formatMessage(content);

  wrapper.appendChild(bubble);
  messagesContainer.appendChild(wrapper);

  scrollToBottom();
}

function renderMessages() {
  if (!messagesContainer) return;

  messagesContainer.innerHTML = "";

  const chat = getCurrentChat();

  if (!chat) {
    showWelcome();
    return;
  }

  chat.messages.forEach(message => {
    addMessageToUI(message.role, message.content);
  });
}

function showWelcome() {
  if (!messagesContainer) return;

  messagesContainer.innerHTML = `
    <div class="veyrox-welcome">
      <h2>VEYROX AI</h2>
      <p>YOUR AI. YOUR SPACE.</p>
      <p>Wie kann ich dir helfen?</p>
    </div>
  `;
}

function scrollToBottom() {
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/* ---------- CHAT HISTORY ---------- */

function renderChatList() {
  if (!chatList) return;

  chatList.innerHTML = "";

  state.chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-history-item";

    if (chat.id === state.currentChatId) {
      item.classList.add("active");
    }

    const title = document.createElement("button");
    title.className = "chat-history-title";
    title.textContent = chat.title || "Neuer Chat";
    title.onclick = () => openChat(chat.id);

    const remove = document.createElement("button");
    remove.className = "chat-history-delete";
    remove.textContent = "×";
    remove.title = "Chat löschen";
    remove.onclick = event => {
      event.stopPropagation();
      deleteChat(chat.id);
    };

    item.append(title, remove);
    chatList.appendChild(item);
  });
}

/* ---------- MODES ---------- */

function setMode(mode) {
  if (!MODES[mode]) return;

  state.mode = mode;

  const chat = getCurrentChat();
  if (chat) chat.mode = mode;

  updateModeButtons();
  saveChats();
}

function updateModeButtons() {
  modeButtons.forEach(button => {
    const selected = button.dataset.mode === state.mode;

    button.classList.toggle("active", selected);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

/* ---------- STATUS ---------- */

function setBusy(busy) {
  state.busy = busy;

  if (sendButton) {
    sendButton.disabled = busy;
  }

  if (input) {
    input.disabled = busy;
  }
}

function showTyping() {
  if (!messagesContainer) return null;

  const typing = document.createElement("div");
  typing.className = "message assistant-message typing-indicator";
  typing.innerHTML = "<span></span><span></span><span></span>";

  messagesContainer.appendChild(typing);
  scrollToBottom();

  return typing;
}

function showError(message) {
  if (!messagesContainer) {
    alert(message);
    return;
  }

  const error = document.createElement("div");
  error.className = "veyrox-error";
  error.textContent = message;

  messagesContainer.appendChild(error);
  scrollToBottom();
}

/* ---------- BACKEND ---------- */

async function getAIResponse(message, chat) {
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

  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error(
      "Backend nicht erreichbar. Prüfe deine Internetverbindung oder Render."
    );
  }

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `Backend lieferte keine gültige JSON-Antwort (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Serverfehler HTTP ${response.status}`
    );
  }

  if (!data.reply || typeof data.reply !== "string") {
    throw new Error("Die KI hat keine gültige Antwort zurückgegeben.");
  }

  return data.reply;
}

/* ---------- SEND MESSAGE ---------- */

async function sendMessage() {
  if (state.busy || !input) return;

  const message = input.value.trim();
  if (!message) return;

  const chat = ensureChat();

  if (chat.messages.length === 0) {
    chat.title = generateTitle(message);
  }

  chat.mode = state.mode;

  chat.messages.push({
    role: "user",
    content: message,
    timestamp: Date.now()
  });

  chat.updatedAt = Date.now();

  saveChats();
  renderChatList();

  input.value = "";
  input.style.height = "";

  addMessageToUI("user", message);

  setBusy(true);
  const typing = showTyping();

  try {
    const reply = await getAIResponse(message, chat);

    if (typing) typing.remove();

    chat.messages.push({
      role: "assistant",
      content: reply,
      timestamp: Date.now()
    });

    chat.updatedAt = Date.now();

    saveChats();
    addMessageToUI("assistant", reply);
  } catch (error) {
    if (typing) typing.remove();

    console.error("VEYROX Chat Fehler:", error);

    showError("Fehler: " + error.message);
  } finally {
    setBusy(false);
    if (input) input.focus();
  }
}

/* ---------- EVENTS ---------- */

if (sendButton) {
  sendButton.addEventListener("click", event => {
    event.preventDefault();
    sendMessage();
  });
}

if (input) {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  });
}

if (newChatButton) {
  newChatButton.addEventListener("click", () => {
    state.currentChatId = null;
    state.mode = "general";
    createChat();
    updateModeButtons();
  });
}

modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

/* ---------- INITIALIZATION ---------- */

loadStorage();
renderChatList();
renderMessages();
updateModeButtons();

console.log("VEYROX AI frontend loaded.");
console.log("Backend:", API_URL);
