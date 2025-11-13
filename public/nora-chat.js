// public/nora-chat.js
// Front-end chat wiring for Nora → /api/nora (Improved 2025 build)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const messagesEl = document.getElementById("chat-messages");
  const sendButton = document.getElementById("send-button");

  if (!form || !input || !messagesEl) {
    console.error("❌ Nora chat: Missing DOM elements");
    return;
  }

  /** Add a message to the chat window */
  function appendMessage(role, text) {
    const msg = document.createElement("div");
    msg.classList.add("message");
    msg.classList.add(role === "user" ? "user" : "assistant");

    // Keep newlines and simple formatting
    msg.textContent = text;

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Sanitize the input — remove accidental double spaces, weird Unicode, extra returns */
  function cleanInput(text) {
    return text
      .replace(/\s+/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  /** Send the user message to the backend Nora API */
  async function sendToNora(userText) {
    // Temporary "typing…" bubble
    const typing = document.createElement("div");
    typing.classList.add("message", "assistant");
    typing.textContent = "…";
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    sendButton.disabled = true;
    input.disabled = true;

    try {
      const res = await fetch("/api/nora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      typing.remove();

      if (!res.ok) {
        const serverError = await res.text();
        console.error("❌ Nora API error:", res.status, serverError);

        appendMessage(
          "assistant",
          "Hmm… I couldn’t complete that request. We might have hit a temporary issue. Try again?"
        );

        return;
      }

      const data = await res.json();
      const reply =
        (data &&
          typeof data.reply === "string" &&
          data.reply.trim()) ||
        "Sorry, I couldn’t generate a response just now.";

      appendMessage("assistant", reply);
    } catch (err) {
      console.error("❌ Nora fetch error:", err);

      typing.remove();

      appendMessage(
        "assistant",
        "I ran into a connection issue talking to the server. Can you try again?"
      );
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  /** Submit handler */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = cleanInput(input.value || "");
    if (!text) return;

    appendMessage("user", text);
    input.value = "";

    sendToNora(text);
  });

  /** Support Shift+Enter for newlines */
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.stopPropagation();
      return; // allow newline
    }
  });
});
