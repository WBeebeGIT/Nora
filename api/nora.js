// /api/nora.js
// Modern, fully working Nora backend

import OpenAI from "openai";

// Ensure Vercel parses JSON request bodies
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
          content: `
You are Nora, the quoting assistant for Cinematic Videographers, LLC.
You speak in a friendly, concise tone.

PRICING RULES — ALWAYS FOLLOW:
- Videography coverage is $400/hr.
- Strict 4-hour minimum.
- Add-ons:
    Drone: $700
    Livestream: $700
    Rush 48 hr: +$200
    Rush 24 hr: +$400
    USB Raw Footage Drive: $100
- NO TRAVEL FEES. Do not add or mention travel charges.

MATH:
- Coverage = hours × 400
- Add add-ons
- Never discount unless user says Will approved a custom price.

OUTPUT FORMAT:
1. Confirm request details.
2. Quote Summary (line items)
3. Final Total

STYLE:
- Friendly, conversational.
- Ask clarifying questions if needed.

            `,
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
    console.error("❌ OpenAI API error in /api/nora:", err);
    return res.status(500).json({
      error: "OpenAI API error — check logs or quota",
      details: err?.response?.data || err.message,
    });
  }
}
