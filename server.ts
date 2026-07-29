import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Lazily retrieve the Groq API Key so the server doesn't crash on startup if missing
function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing from environment. Please add it in Settings > Secrets.");
  }
  return apiKey;
}

export const app = express();

// Middleware for parsing JSON requests
app.use(express.json());

// API Route: Health Check
app.all("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API Route: Send message or initiate SSE stream with Groq
app.post("/api/chat", async (req, res) => {
  try {
    const { systemInstruction, contents, stream } = req.body;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: "Invalid request payload. 'contents' array is required." });
    }

    const apiKey = getGroqApiKey();

    // Convert Gemini format to Groq messages format
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }

    for (const item of contents) {
      const role = item.role === "model" ? "assistant" : "user";
      const content = Array.isArray(item.parts)
        ? item.parts.map((p: any) => p.text || "").join("")
        : (item.parts?.text || "");
      messages.push({ role, content });
    }

    if (stream) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.2,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API returned status ${response.status}: ${errText}`);
      }

      // SSE Headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleaned = line.trim();
            if (cleaned.startsWith("data: ")) {
              const rawData = cleaned.substring(6);
              if (rawData === "[DONE]") {
                break;
              }
              try {
                const parsed = JSON.parse(rawData);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
                }
              } catch (e) {
                // Ignore parse errors on partial or invalid chunks
              }
            }
          }
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API returned status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";
      res.json({ text: responseText });
    }
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred while calling the Groq API." });
  }
});

// API Route: Non-streaming raw chat completion
app.post("/api/chat-raw", async (req, res) => {
  try {
    const { systemInstruction, contents, prompt } = req.body;

    const apiKey = getGroqApiKey();

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }

    if (contents && Array.isArray(contents)) {
      for (const item of contents) {
        const role = item.role === "model" ? "assistant" : "user";
        const content = Array.isArray(item.parts)
          ? item.parts.map((p: any) => p.text || "").join("")
          : (item.parts?.text || "");
        messages.push({ role, content });
      }
    } else if (prompt) {
      messages.push({ role: "user", content: prompt });
    } else {
      return res.status(400).json({ error: "Invalid request payload. 'contents' array or 'prompt' is required." });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "";
    res.json({ text: responseText, response: responseText });
  } catch (error: any) {
    console.error("Groq Raw API Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred while calling the Groq API." });
  }
});

// API Route: Extract lead information from conversation history
app.post("/api/extract-lead", async (req, res) => {
  try {
    const { contents } = req.body;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: "Invalid request payload. 'contents' array is required." });
    }

    const apiKey = getGroqApiKey();

    const systemInstruction = `Analyze the conversation history between the customer and the receptionist.
Extract the following details if they have been mentioned by the customer. Be accurate and do not guess. If a field has not been provided or is unclear, you must set its value to null.
- Customer Name
- Phone Number
- Email Address
- Requested Service
- Customer Question
- Preferred Appointment Date (if mentioned)
- Preferred Appointment Time (if mentioned)

Also, analyze if a Human Handoff is required. You MUST set handoffTriggered to true if any of the following are detected:
1. The AI receptionist cannot answer a question (e.g., explicitly states it doesn't have the information, cannot find the details, doesn't know, or says a human specialist needs to answer).
2. The customer explicitly asks for a human, real person, live operator, support agent, specialist, representative, or manager.
3. The customer expresses a complaint, negative feedback, extreme frustration, anger, or describes an urgent/critical situation requiring immediate attention.

If handoffTriggered is true, determine the handoffReason (e.g., "AI cannot answer", "Customer requested human", or "Complaint / Urgent situation") and determine handoffPriority ('low', 'medium', 'high', or 'urgent') based on sentiment or urgency. If not triggered, set handoffTriggered to false and handoffReason/handoffPriority to null.

You MUST respond ONLY with a valid, single JSON object containing EXACTLY the keys below. Do not wrap the output in markdown code blocks or add any text.

Required JSON structure:
{
  "name": string | null,
  "phone": string | null,
  "email": string | null,
  "service": string | null,
  "question": string | null,
  "appointmentDate": string | null,
  "appointmentTime": string | null,
  "appointmentConfirmed": boolean,
  "handoffTriggered": boolean,
  "handoffReason": string | null,
  "handoffPriority": string | null
}
`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...contents.map((item: any) => {
        const role = item.role === "model" ? "assistant" : "user";
        const content = Array.isArray(item.parts)
          ? item.parts.map((p: any) => p.text || "").join("")
          : (item.parts?.text || "");
        return { role, content };
      })
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    let extractedText = data.choices?.[0]?.message?.content || "{}";

    // Clean up potential markdown wrappers
    extractedText = extractedText.trim();
    if (extractedText.startsWith("```json")) {
      extractedText = extractedText.substring(7);
    } else if (extractedText.startsWith("```")) {
      extractedText = extractedText.substring(3);
    }
    if (extractedText.endsWith("```")) {
      extractedText = extractedText.substring(0, extractedText.length - 3);
    }

    res.json(JSON.parse(extractedText.trim()));
  } catch (error: any) {
    console.error("Lead Extraction Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during lead extraction." });
  }
});

// Standalone server initialization for dev mode and Cloud Run / Docker containers
async function startServer() {
  const PORT = 3000;

  // Integrate Vite middleware for assets/routes
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
