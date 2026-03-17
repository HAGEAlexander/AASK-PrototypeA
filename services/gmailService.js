/**
 * Gmail Service
 * Uses Gmail API + Google Cloud Pub/Sub for real-time push notifications.
 * No polling needed — Google calls your webhook when new mail arrives.
 */

const { google } = require("googleapis");
const { addMessage } = require("../store/messages");

// Build OAuth2 client from env vars
function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * Register a Gmail push watch so Google notifies your webhook
 * on every new message. Must be renewed every 7 days (set up a cron).
 */
async function initGmailWatch() {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.PUBSUB_TOPIC_NAME,
      labelIds: ["INBOX"],
    },
  });

  console.log("Gmail watch registered, expiry:", new Date(Number(res.data.expiration)));
  return res.data;
}

/**
 * Fetch and parse a Gmail message by ID.
 * Called from the webhook route after Pub/Sub notifies us.
 */
async function fetchAndStoreMessage(messageId) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = res.data.payload.headers;
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  const from = getHeader("From");
  const subject = getHeader("Subject");
  const date = getHeader("Date");

  // Extract sender name and email from "Name <email>" format
  const nameMatch = from.match(/^(.+?)\s*<(.+)>$/);
  const senderName = nameMatch ? nameMatch[1].replace(/"/g, "").trim() : from;
  const sender = nameMatch ? nameMatch[2] : from;

  // Decode body (plain text preferred)
  const body = extractBody(res.data.payload);

  const msg = addMessage({
    channel: "email",
    sender,
    senderName,
    subject,
    body: body || "(no text content)",
    timestamp: date ? new Date(date).toISOString() : new Date().toISOString(),
  });

  console.log(`📧 Gmail from ${senderName} <${sender}>: ${subject}`);
  return msg;
}

/** Recursively extract plain text body from MIME parts */
function extractBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
    // Fallback: try HTML part
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      // Recurse into multipart
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }
  return null;
}

module.exports = { initGmailWatch, fetchAndStoreMessage };
