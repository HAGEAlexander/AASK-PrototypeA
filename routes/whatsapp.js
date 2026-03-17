/**
 * WhatsApp Business webhook
 * Based on Jasper's Market (fbsamples/whatsapp-business-jaspers-market)
 */

const express = require("express");
const router = express.Router();
const { addMessage } = require("../store/messages");

// Webhook verification (Meta requirement)
router.get("/", (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "my_verify_token";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Incoming messages
router.post("/", (req, res) => {
  const body = req.body;

  if (body.object !== "whatsapp_business_account") {
    return res.sendStatus(404);
  }

  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Process each incoming message
    const incomingMessages = value?.messages || [];
    for (const waMsg of incomingMessages) {
      if (waMsg.type !== "text") continue; // extend for image/audio later

      // Resolve display name from contacts list
      const contact = value?.contacts?.find(
        (c) => c.wa_id === waMsg.from
      );
      const senderName =
        contact?.profile?.name || waMsg.from;

      const msg = addMessage({
        channel: "whatsapp",
        sender: waMsg.from,
        senderName,
        subject: null,
        body: waMsg.text.body,
        timestamp: new Date(Number(waMsg.timestamp) * 1000).toISOString(),
      });

      console.log(`📱 WhatsApp from ${senderName}: ${waMsg.text.body}`);

      // Broadcast to dashboard
      const broadcast = req.app.get("broadcast");
      if (broadcast) broadcast(msg);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
