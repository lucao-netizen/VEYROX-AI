
/* =========================================
   VEYROX AI — VERSION 1.0
   Chat System
========================================= */

"use strict";

/* =========================================
   CONFIGURATION
========================================= */

// Wird später durch die echte Backend-URL ersetzt.
const API_URL = "";

const STORAGE_KEY = "veyrox_chats_v1";
const THEME_KEY = "veyrox_theme_v1";

/* =========================================
   ELEMENTS
========================================= */

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const chatHistoryEl = document.getElementById("chatHistory");
const newChatBtn = document.getElementById("newChatBtn");
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");
const currentModeEl = document.getElementById("currentMode");
const modeButtons = document.querySelectorAll(".mode-btn");
const suggestionButtons = document.querySelectorAll(".suggestion-card");
const sidebar = document.getElementById("sidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

/* =========================================
   STATE
========================================= */

let chats = loadChats();
let currentChatId = null;
let currentMode = "general";
let isLoading = false;

const modes = {
  general: {
    label: "Allgemein",
    icon: "✦",
    instruction:
      "Du bist VEYROX, ein hilfreicher KI-Assistent. Antworte klar, verständlich und präzise. Verwende die Sprache des Nutzers."
  },

  writing: {
    label: "Schreiben",
    icon: "✎",
    instruction:
      "Du bist VEYROX im Schreibmodus. Hilf beim Schreiben, Überarbeiten, Formulieren und Entwickeln von Texten. Passe den Stil an die Anfrage an."
  },

  coding: {
    label: "Coding",
    icon: "⌘",
    instruction:
      "Du bist VEYROX im Coding-Modus. Schreibe sauberen und funktionierenden Code. Erkläre Fehler verständlich und liefere vollständige Lösungen, wenn sie verlangt werden."
  },

  summary: {
    label: "Zusammenfassen",
    icon: "▤",
    instruction:
      "Du bist VEYROX im Zusammenfassungsmodus. Fasse Inhalte übersichtlich, korrekt und auf das Wesentliche konzentriert zusammen. Erfinde keine Informationen."
  }
};

/* =========================================
   STORAGE
========================================= */

function loadChats() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(chat =>
      chat &&
      typeof chat.id === "string" &&
      Array.isArray(chat.messages)
    );

  } catch (error) {
    console.error("Chatverlauf konnte nicht geladen werden:", error);
    return [];
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error("Chatverlauf konnte nicht gespeichert werden:", error);
  }
}

/* =========================================
   HELPERS
========================================= */

function createId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMessage(text) {
  let safe = escapeHTML(text);

  // Codeblöcke
  safe = safe.replace(
    /```([\w+-]*)\n([\s\S]*?)```/g,
    (match, language, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    }
  );

  // Inline-Code
  safe = safe.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  // Fett
  safe = safe.replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>"
  );

  // Kursiv
  safe = safe.replace(
    /\*([^*]+)\*/g,
    "<em>$1</em>"
  );

  // Zeilenumbrüche
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

function getCurrentChat() {
  return chats.find(chat => chat.id === currentChatId) || null;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const chatArea = document.getElementById("chatArea");

    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  });
}

function closeMobileSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("visible");
}

/* =========================================
   CHAT MANAGEMENT
========================================= */

function createChat() {
  const chat = {
    id: createId(),
    title: "Neuer Chat",
    mode: currentMode,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  chats.unshift(chat);
  currentChatId = chat.id;

  saveChats();
  renderHistory();
  renderMessages();

  messageInput.value = "";
  autoResizeInput();
  messageInput.focus();

  return chat;
}

function selectChat(id) {
  const chat = chats.find(item => item.id === id);

  if (!chat) return;

  currentChatId = id;
  currentMode = modes[chat.mode] ? chat.mode : "general";

  updateModeUI();
  renderHistory();
  renderMessages();
  closeMobileSidebar();
}

function deleteChat(id) {
  chats = chats.filter(chat => chat.id !== id);

  if (currentChatId === id) {
    currentChatId = chats.length ? chats[0].id : null;
  }

  saveChats();
  renderHistory();
  renderMessages();
}

function updateChatTitle(chat, firstMessage) {
  if (chat.messages.length <= 1) {
    const title = firstMessage.trim();

    chat.title =
      title.length > 38
        ? title.slice(0, 38) + "..."
        : title;
  }
}

function renderHistory() {
  chatHistoryEl.innerHTML = "";

  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "history-item";

    if (chat.id === currentChatId) {
      item.classList.add("active");
    }

    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title || "Neuer Chat";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-delete";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Chat löschen";
    deleteBtn.setAttribute("aria-label", "Chat löschen");

    item.appendChild(title);
    item.appendChild(deleteBtn);

    item.addEventListener("click", event => {
      if (event.target === deleteBtn) return;
      selectChat(chat.id);
    });

    deleteBtn.addEventListener("click", event => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    chatHistoryEl.appendChild(item);
  });
}

/* =========================================
   RENDER MESSAGES
========================================= */

function renderMessages() {
  messagesEl.innerHTML = "";

  const chat = getCurrentChat();

  if (!chat || chat.messages.length === 0) {
    welcomeEl.style.display = "flex";
    messagesEl.style.display = "none";
    return;
  }

  welcomeEl.style.display = "none";
  messagesEl.style.display = "flex";

  chat.messages.forEach(message => {
    addMessageToUI(message.role, message.content);
  });

  scrollToBottom();
}

/* KORRIGIERTE NACHRICHTEN-FUNKTION */

function addMessageToUI(role, messageContent) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "U" : "V";

  const contentEl = document.createElement("div");
  contentEl.className = "message-content";

  if (role === "assistant") {
    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = "VEYROX";
    contentEl.appendChild(name);
  }

  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.innerHTML = formatMessage(messageContent);

  contentEl.appendChild(textEl);
  wrapper.appendChild(avatar);
  wrapper.appendChild(contentEl);

  messagesEl.appendChild(wrapper);

  scrollToBottom();
}

/* =========================================
   TYPING INDICATOR
========================================= */

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "message assistant";
  wrapper.id = "typingIndicator";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "V";

  const content = document.createElement("div");
  content.className = "message-content";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = "VEYROX";

  const dots = document.createElement("div");
  dots.className = "typing-indicator";

  dots.innerHTML = "<span></span><span></span><span></span>";

  content.appendChild(name);
  content.appendChild(dots);

  wrapper.appendChild(avatar);
  wrapper.appendChild(content);

  messagesEl.appendChild(wrapper);

  scrollToBottom();
}

function removeTyping() {
  document.getElementById("typingIndicator")?.remove();
}

/* =========================================
   MODE SYSTEM
========================================= */

function setMode(mode) {
  if (!modes[mode]) return;

  currentMode = mode;

  const chat = getCurrentChat();

  if (chat) {
    chat.mode = mode;
    chat.updatedAt = Date.now();
    saveChats();
  }

  updateModeUI();
}

function updateModeUI() {
  modeButtons.forEach(button => {
    const active = button.dataset.mode === currentMode;

    button.classList.toggle("active", active);
  });

  const mode = modes[currentMode];

  if (mode && currentModeEl) {
    currentModeEl.textContent = `${mode.icon} ${mode.label}`;
  }
}

/* =========================================
   INPUT SYSTEM
========================================= */

function autoResizeInput() {
  messageInput.style.height = "auto";

  messageInput.style.height =
    Math.min(messageInput.scrollHeight, 180) + "px";

  sendBtn.disabled =
    !messageInput.value.trim() || isLoading;
}

messageInput.addEventListener("input", autoResizeInput);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage(customText = null) {
  if (isLoading) return;

  const message = (customText ?? messageInput.value).trim();

  if (!message) return;

  let chat = getCurrentChat();

  if (!chat) {
    chat = createChat();
  }

  const userMessage = {
    role: "user",
    content: message
  };

  chat.messages.push(userMessage);

  updateChatTitle(chat, message);
  chat.updatedAt = Date.now();

  messageInput.value = "";
  autoResizeInput();

  saveChats();
  renderHistory();
  renderMessages();

  isLoading = true;
  sendBtn.disabled = true;

  showTyping();

  try {
    const response = await getAIResponse(chat);

    removeTyping();

    chat.messages.push({
      role: "assistant",
      content: response
    });

    chat.updatedAt = Date.now();

    saveChats();
    renderMessages();
    renderHistory();

  } catch (error) {
    removeTyping();

    const errorMessage =
      error.message || "Ein unbekannter Fehler ist aufgetreten.";

    chat.messages.push({
      role: "assistant",
      content: "⚠️ " + errorMessage
    });

    saveChats();
    renderMessages();

  } finally {
    isLoading = false;
    autoResizeInput();
  }
}

/* =========================================
   AI BACKEND CONNECTION
========================================= */

async function getAIResponse(chat) {
  if (!API_URL) {
    throw new Error(
      "Das VEYROX-Backend ist noch nicht verbunden. Die Backend-Adresse fehlt."
    );
  }

  const mode = modes[chat.mode || currentMode];

  const history = chat.messages.slice(-20).map(message => ({
    role: message.role,
    content: message.content
  }));

  const lastMessage =
    chat.messages[chat.messages.length - 1];

  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      message: lastMessage.content,
      mode: chat.mode || currentMode,
      systemInstruction: mode.instruction,
      history: history
    })
  });

  if (!response.ok) {
    let errorMessage = "Die Anfrage ist fehlgeschlagen.";

    try {
      const errorData = await response.json();

      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Server hat keine JSON-Antwort geliefert
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.reply || typeof data.reply !== "string") {
    throw new Error("Der KI-Dienst hat keine gültige Antwort geliefert.");
  }

  return data.reply;
}

/* =========================================
   NEW CHAT BUTTON
========================================= */

newChatBtn.addEventListener("click", () => {
  createChat();
  closeMobileSidebar();
});

/* =========================================
   SEND BUTTON
========================================= */

sendBtn.addEventListener("click", () => {
  sendMessage();
});

/* =========================================
   MODE BUTTONS
========================================= */

modeButtons.forEach(button => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

/* =========================================
   SUGGESTIONS
========================================= */

suggestionButtons.forEach(button => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt;

    if (prompt) {
      sendMessage(prompt);
    }
  });
});

/* =========================================
   THEME SYSTEM
========================================= */

function applyTheme(theme) {
  const isLight = theme === "light";

  document.body.classList.toggle("light-theme", isLight);

  themeIcon.textContent = isLight ? "☀" : "☾";

  themeText.textContent =
    isLight ? "Dark Mode" : "Design wechseln";
}

themeBtn.addEventListener("click", () => {
  const isLight =
    document.body.classList.contains("light-theme");

  const newTheme = isLight ? "dark" : "light";

  localStorage.setItem(THEME_KEY, newTheme);

  applyTheme(newTheme);
});

/* =========================================
   MOBILE SIDEBAR
========================================= */

mobileMenuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("visible");
});

sidebarOverlay.addEventListener("click", closeMobileSidebar);

/* =========================================
   INITIALIZATION
========================================= */

function init() {
  const savedTheme =
    localStorage.getItem(THEME_KEY) || "dark";

  applyTheme(savedTheme);

  updateModeUI();
  renderHistory();

  if (chats.length > 0) {
    currentChatId = chats[0].id;
    currentMode = modes[chats[0].mode]
      ? chats[0].mode
      : "general";

    updateModeUI();
  }

  renderMessages();
  autoResizeInput();
}

init();
