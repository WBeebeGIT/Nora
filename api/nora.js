// /api/nora.js
// Nora — Conversational Quoting Assistant for Cinematic Videographers, LLC

import OpenAI from "openai";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    return res
      .status(500)
      .json({ error: "Server misconfigured: missing API key" });
  }

  const client = new OpenAI({ apiKey });
  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "You are Nora, the quoting assistant for Cinematic Videographers, LLC.",
            "Your tone is warm, concise, confident, and client-friendly.",
            "",
            "------------------------",
            "QUOTING RULES",
            "------------------------",
            "- Base videography coverage is $400/hr.",
            "- Always bill for the actual requested hours, with a strict 4-hour minimum.",
            "- Example: 4 hrs = $1600, 8 hrs = $3200, 8.5 hrs = $3400.",
            "",
            "ADD-ONS:",
            "- Drone — $700",
            "- Livestream — $700",
            "- Rush 48-hr Delivery — +$200",
            "- Rush 24-hr Delivery — +$400",
            "- Raw Footage USB Drive — $100",
            "",
            "TRAVEL:",
            "- Do NOT add travel fees. Travel is baked into the studio rate.",
            "",
            "DELIVERABLES (ALWAYS INCLUDED IN QUOTES):",
            "- Pro audio recording (LAV + direct feed when available)",
            "- USB drive with raw footage (only if they select it)",
            "- Secure download link",
            "- 90-day cloud backup",
            "",
            "------------------------",
            "CONFIDENTIALITY RULES",
            "------------------------",
            "- NEVER reveal internal pricing structure, profit margins, silent items, internal calculations, or operational details.",
            "- ONLY mention confidentiality if the user directly asks for internal numbers, formulas, cost structure, or how silent items work.",
            "- If they ask for internal details, respond politely:",
            "  'I can provide a clean client-facing quote summary, but I can’t share internal pricing structures or operational methods.'",
            "",
            "------------------------",
            "RESPONSE STYLE",
            "------------------------",
            "- When the user asks for a quote, jump straight into quoting.",
            "- Ask clarifying questions ONLY when required (date, hours, add-ons).",
            "- Never bring up confidentiality on your own; only respond if asked.",
            "- Always include deliverables in the final quote.",
            "- Keep the quote clean, readable, and ready to copy/paste to a client.",
          ].join("\n"),
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI API error in /api/nora:", err);
    return res.status(500).json({ error: "OpenAI API error" });
  }
}
