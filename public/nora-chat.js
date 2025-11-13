// public/nora-chat.js
// Front-end chat wiring for Nora → /api/nora

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const messagesEl = document.getElementById("chat-messages");
  const sendButton = document.getElementById("send-button");

  if (!form || !input || !messagesEl) {
    console.error("Nora chat: missing DOM elements");
    return;
  }

  function appendMessage(role, text) {
    const msg = document.createElement("div");
    msg.classList.add("message");
    msg.classList.add(role === "user" ? "user" : "assistant");
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendToNora(userText) {
    // Show a lightweight "thinking" bubble
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
        console.error("Nora API error:", res.status);
        appendMessage(
          "assistant",
          "Hmm — I couldn’t complete that request. Please try again in a moment."
        );
        return;
      }

      const data = await res.json();
      const reply =
        (data && typeof data.reply === "string" && data.reply.trim()) ||
        "Sorry, I couldn’t generate a response just now.";

      appendMessage("assistant", reply);
    } catch (err) {
      console.error("Nora fetch error:", err);
      typing.remove();
      appendMessage(
        "assistant",
        "I ran into a connection issue talking to the server. Please try again."
      );
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (input.value || "").trim();
    if (!text) return;

    appendMessage("user", text);
    input.value = "";
    sendToNora(text);
  });
});
