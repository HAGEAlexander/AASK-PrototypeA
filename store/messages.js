/**
 * Simple in-memory message store.
 * For production, replace with PostgreSQL / SQLite.
 */

const messages = [];
let idCounter = 1;

function addMessage({ channel, sender, senderName, subject, body, timestamp }) {
  const msg = {
    id: idCounter++,
    channel,        // 'whatsapp' | 'email'
    sender,         // phone number or email address
    senderName,     // display name
    subject,        // email subject or null
    body,
    timestamp: timestamp || new Date().toISOString(),
    read: false,
  };
  messages.unshift(msg); // newest first
  return msg;
}

function getMessages({ channel, limit = 50 } = {}) {
  let result = [...messages];
  if (channel) result = result.filter((m) => m.channel === channel);
  return result.slice(0, limit);
}

function markRead(id) {
  const msg = messages.find((m) => m.id === Number(id));
  if (msg) msg.read = true;
  return msg;
}

function getUnreadCount() {
  return messages.filter((m) => !m.read).length;
}

module.exports = { addMessage, getMessages, markRead, getUnreadCount };
