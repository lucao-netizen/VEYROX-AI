
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ai = API_KEY
  ? new GoogleGenAI({ apiKey: API_KEY })
  : null;

/* =========================================
   VEYROX CONFIG
========================================= */

const ALLOWED_ORIGINS = [
  "https://lucao-netizen.github.io"
];

const MODES = {
  general: `
Du bist VEYROX, ein hilfreicher KI-Assistent.
Antworte klar, natürlich und präzise.
Nutze die Sprache des Nutzers.
`,

  writing: `
Du bist VEYROX im Schreibmodus.
Hilf beim Schreiben, Verbessern, Formulieren
und Überarbeiten von Texten.
Passe deinen Stil an die Anfrage an.
`,

  coding: `
Du bist VEYROX im Coding-Modus.
Schreibe verständlichen, strukturierten Code.
Erkläre Programmierfehler und liefere Lösungen.
`,

  summary: `
Du bist VEYROX im Zusammenfassungsmodus.
Fasse Inhalte verständlich, korrekt und
übersichtlich zusammen.
Erfinde keine Informationen.
`
};

/* =========================================
   CORS
========================================= */

app.use(cors({
  origin(origin, callback) {
    // Requests ohne Origin sind z. B. interne Tools.
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed"));
  }
}));

app.use(express.json({ limit: "30kb" }));

/* =========================================
   BASIC RATE LIMITING
========================================= */

const requestCounts = new Map();

const RATE_LIMIT = 15;
const RATE_WINDOW = 60 * 1000;

app.use("/api/chat", (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.start > RATE_WINDOW) {
    requestCounts.set(ip, {
      start: now,
      count: 1
    });

    return next();
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: "Zu viele Anfragen. Bitte warte kurz."
    });
  }

  next();
});

/* =========================================
   STATUS ENDPOINT
========================================= */

app.get("/", (req, res) => {
  res.json({
    name: "VEYROX AI Backend",
    status: "online",
    version: "1.0.0"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    aiConfigured: Boolean(API_KEY),
    model: MODEL
  });
});

/* =========================================
   CHAT ENDPOINT
========================================= */

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Der KI-Server ist noch nicht konfiguriert."
      });
    }

    const { message, mode, history } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Bitte gib eine Nachricht ein."
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        error: "Deine Nachricht ist zu lang."
      });
    }

    const selectedMode = MODES[mode] ? mode : "general";

    const validHistory = Array.isArray(history)
      ? history.slice(-20)
      : [];

    const contents = validHistory
      .filter(item =>
        item &&
        typeof item.content === "string" &&
        ["user", "assistant"].includes(item.role)
      )
      .map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{
          text: item.content.slice(0, 10000)
        }]
      }));

    // Die Nachrichtenhistorie enthält bereits
    // die aktuelle Nachricht aus script.js.
    // Falls nicht, ergänzen wir sie.
    const lastContent = contents[contents.length - 1];

    if (
      !lastContent ||
      lastContent.role !== "user" ||
      lastContent.parts[0].text !== message
    ) {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    const result = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: MODES[selectedMode],
        maxOutputTokens: 4096
      }
    });

    const reply = result.text;

    if (!reply || !reply.trim()) {
      return res.status(502).json({
        error: "Gemini hat keine Antwort zurückgegeben."
      });
    }

    return res.json({
      reply: reply,
      mode: selectedMode
    });

  } catch (error) {
    console.error("VEYROX API Fehler:", error.message);

    return res.status(500).json({
      error: "Die KI konnte gerade nicht antworten. Bitte versuche es erneut."
    });
  }
});

/* =========================================
   SERVER
========================================= */

app.listen(PORT, () => {
  console.log(`VEYROX Backend läuft auf Port ${PORT}`);
});
