/**
 * Gmail Pub/Sub webhook
 * Google Cloud Pub/Sub calls this endpoint when new mail arrives in Gmail.
 */

const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const { fetchAndStoreMessage } = require("../services/gmailService");

// Track last processed historyId to avoid duplicate processing
let lastHistoryId = null;

router.post("/", async (req, res) => {
  // Acknowledge immediately — Pub/Sub will retry if you don't respond fast
  res.sendStatus(200);

  try {
    // Pub/Sub wraps the payload in base64
    const pubsubMessage = req.body?.message;
    if (!pubsubMessage?.data) return;

    const decoded = JSON.parse(
      Buffer.from(pubsubMessage.data, "base64").toString("utf-8")
    );

    const { emailAddress, historyId } = decoded;
    console.log(`📬 Gmail notification for ${emailAddress}, historyId: ${historyId}`);

    if (!historyId) return;

    // Fetch history since last known ID
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId: lastHistoryId || historyId,
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    });

    lastHistoryId = historyId;

    const historyItems = historyRes.data.history || [];
    const newMessageIds = new Set();

    for (const item of historyItems) {
      for (const added of item.messagesAdded || []) {
        newMessageIds.add(added.message.id);
      }
    }

    // Fetch and store each new message
    for (const msgId of newMessageIds) {
      try {
        const msg = await fetchAndStoreMessage(msgId);
        const broadcast = req.app.get("broadcast");
        if (broadcast && msg) broadcast(msg);
      } catch (e) {
        console.error(`Failed to fetch message ${msgId}:`, e.message);
      }
    }
  } catch (err) {
    console.error("Gmail webhook error:", err.message);
  }
});

module.exports = router;
