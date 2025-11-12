// public/nora-chat.js
//
// Frontend chat logic for Nora help page.

(function () {
  const chatBody = document.getElementById("chat-body");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("chat-send");

  // Conversation state we send to the backend.
  // You can inspect this in dev tools if needed.
  const messages = [];

  function appendMessage(role, content) {
    const row = document.createElement("div");
    row.className = "bubble-row " + (role === "user" ? "user" : "assistant");

    const bubble = document.createElement("div");
    bubble.className = "bubble " + (role === "user" ? "user" : "assistant");
    bubble.textContent = content;

    row.appendChild(bubble);
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function setSending(isSending) {
    sendButton.disabled = isSending;
    chatInput.disabled = isSending;
  }

  async function sendToNora(userText) {
    // Push user's message into state and UI
    messages.push({ role: "user", content: userText });
    appendMessage("user", userText);

    // Temporary "typing…" bubble
    const typingRow = document.createElement("div");
    typingRow.className = "bubble-row assistant";
    const typingBubble = document.createElement("div");
    typingBubble.className = "bubble assistant";
    typingBubble.textContent = "Nora is typing…";
    typingRow.appendChild(typingBubble);
    chatBody.appendChild(typingRow);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
      setSending(true);

      const response = await fetch("/api/nora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();

      // Remove the typing bubble
      chatBody.removeChild(typingRow);

      if (!response.ok || !data.reply) {
        const errorText =
          data?.error || "Sorry, something went wrong talking to Nora.";
        appendMessage("assistant", errorText);
        messages.push({ role: "assistant", content: errorText });
        return;
      }

      appendMessage("assistant", data.reply);
      messages.push({ role: "assistant", content: data.reply });
    } catch (err) {
      console.error("Error calling /api/nora:", err);
      chatBody.removeChild(typingRow);
      const errorText =
        "Sorry, I ran into a connection issue. Please try again in a moment.";
      appendMessage("assistant", errorText);
      messages.push({ role: "assistant", content: errorText });
    } finally {
      setSending(false);
    }
  }

  // Initial greeting (local only; not sent to API until user replies)
  const initialGreeting =
    "Hi! I’m Nora. I can help you with instant videography quotes. " +
    "Tell me about your event — date, location, and how many hours you’re thinking — " +
    "and I’ll walk you through coverage and add-ons.";
  appendMessage("assistant", initialGreeting);
  messages.push({ role: "assistant", content: initialGreeting });

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    sendToNora(text);
  });
})();
