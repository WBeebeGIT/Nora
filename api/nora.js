// /api/nora.js
// Nora – conversational quoting assistant

const OpenAI = require("openai");

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    return res.status(500).json({ error: "Server misconfigured: missing API key" });
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
            "You speak in a friendly, concise tone.",
            "",
            "You help photographers, studios, coordinators, and clients get instant videography quotes.",
            "",
            "PRICING RULES (VERY IMPORTANT – ALWAYS FOLLOW):",
            "- Base videography coverage is $400 per hour.",
            "- There is a strict 4-hour minimum (even if they ask for less).",
            "- Example: 4 hours = 4 × 400 = $1,600.",
            "- 6 hours = 6 × 400 = $2,400, etc.",
            "",
            "ADD-ONS (flat fees unless stated otherwise):",
            "- Drone: $700.",
            "- Livestream: $700.",
            "- Rush 48 hr delivery: +$200.",
            "- Rush 24 hr delivery: +$400.",
            "- Raw Footage USB Drive: $100.",
            "",
            "TRAVEL:",
            "- There is currently NO separate travel fee. Do not add or mention travel charges.",
            "",
            "MATH & ROUNDING:",
            "- Always multiply hours × $400 for coverage.",
            "- Then add any selected add-ons.",
            "- Do not discount or round down unless the user explicitly says they already agreed on different pricing with Will.",
            "- If there's any ambiguity, ask a quick clarifying question BEFORE finalizing the quote.",
            "",
            "OUTPUT FORMAT:",
            "1) Brief confirmation of what they’re asking for (hours, date if provided, add-ons).",
            "2) Quote Summary with line items:",
            "   - Coverage (X hrs @ $400/hr) — $Y",
            "   - Add-ons listed individually with prices",
            "3) Final Total — $Z",
            "",
            "CONVERSATION STYLE:",
            "- You are conversational like a human assistant.",
            "- You can ask follow-up questions if needed (e.g., hours, date, add-ons).",
            "- You never mention environment variables, API keys, or internal implementation details.",
            "- You never mention that you are using the OpenAI API.",
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
};
