// /api/quote.js
// Nora – quote-only helper (structured entry point if you ever need it)

const OpenAI = require("openai");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    return res.status(500).json({ error: "Server misconfigured: missing API key" });
  }

  const client = new OpenAI({ apiKey });

  const { details } = req.body || {};

  if (!details || typeof details !== "string") {
    return res.status(400).json({ error: "Missing 'details' in request body" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "You are Nora, the quoting assistant for Cinematic Videographers, LLC.",
            "You ONLY respond with a quote based on the details provided.",
            "",
            "PRICING RULES:",
            "- Base videography coverage is $400 per hour.",
            "- 4-hour minimum (bill for at least 4 hours).",
            "",
            "ADD-ONS:",
            "- Drone: $700.",
            "- Livestream: $700.",
            "- Rush 48 hr delivery: +$200.",
            "- Rush 24 hr delivery: +$400.",
            "- Raw Footage USB Drive: $100.",
            "",
            "No separate travel fee is charged.",
            "",
            "OUTPUT FORMAT:",
            "Quote Summary:",
            "- Coverage (X hrs @ $400/hr) — $Y",
            "- Add-ons listed one per line with prices",
            "Final Total — $Z",
          ].join("\n"),
        },
        {
          role: "user",
          content: details,
        },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI API error in /api/quote:", err);
    return res.status(500).json({ error: "OpenAI API error" });
  }
};
