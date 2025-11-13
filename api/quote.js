// /api/quote.js
// Nora – quote-only structured endpoint

import OpenAI from "openai";

// Ensure JSON body parsing on Vercel
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing OPENAI_API_KEY in environment");
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
          content: `
You are Nora, the quoting assistant for Cinematic Videographers, LLC.
You ONLY respond with a clean quote based on the details provided.

PRICING RULES:
- Videography coverage: $400/hr.
- Strict 4-hour minimum.
- Add-ons:
    Drone: $700
    Livestream: $700
    Rush 48 hr: +$200
    Rush 24 hr: +$400
    Raw Footage USB Drive: $100
- NO travel fees.

FORMAT:
Quote Summary:
- Coverage (X hrs @ $400/hr) — $Y
- Add-ons (each listed separately)
Final Total — $Z
          `,
        },
        {
          role: "user",
          content: details,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a quote right now.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ OpenAI API error in /api/quote:", err);
    return res.status(500).json({
      error: "OpenAI API error — check logs or quota",
      details: err?.response?.data || err.message,
    });
  }
}
