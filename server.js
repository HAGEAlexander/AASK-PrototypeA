/**
 * Unified Inbox Server
 * Combines WhatsApp Business (Jasper's Market) + Gmail into one dashboard
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const whatsappRouter = require("./routes/whatsapp");
const gmailRouter = require("./routes/gmail");
const messagesRouter = require("./routes/messages");
const { initGmailWatch } = require("./services/gmailService");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Make WebSocket server available to routes
app.set("wss", wss);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/webhooks/whatsapp", whatsappRouter);
app.use("/webhooks/gmail", gmailRouter);
app.use("/api/messages", messagesRouter);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// WebSocket connection log
wss.on("connection", (ws) => {
  console.log("Dashboard client connected");
  ws.on("close", () => console.log("Dashboard client disconnected"));
});

// Broadcast new message to all connected dashboard clients
function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "new_message", message }));
    }
  });
}
app.set("broadcast", broadcast);

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`\n✅ Unified Inbox running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp webhook: POST /webhooks/whatsapp`);
  console.log(`📧 Gmail webhook:    POST /webhooks/gmail`);
  console.log(`🖥  Dashboard:        http://localhost:${PORT}\n`);

  // Start Gmail push notifications
  if (process.env.GOOGLE_CLIENT_ID) {
    try {
      await initGmailWatch();
      console.log("✅ Gmail watch initialized");
    } catch (e) {
      console.warn("⚠️  Gmail watch failed to start:", e.message);
    }
  } else {
    console.warn("⚠️  No GOOGLE_CLIENT_ID set - Gmail push disabled");
  }
});

module.exports = { app, broadcast };
