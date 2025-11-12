import OpenAI from 'openai';

export default async function handler(req, res) {
  try {
    const { messages = [] } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(200).json({ reply: "I'm here to help with quotes. (AI is currently offline.)" });
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: "You are Nora, a client-facing assistant. Collect event details and present totals. Never reveal internal rates or calculation steps." },
        ...messages
      ]
    });
    res.status(200).json({ reply: completion.choices?.[0]?.message?.content || '' });
  } catch (e) {
    res.status(200).json({ reply: "I'm here to help with quotes and availability. (AI is currently offline.)" });
  }
}