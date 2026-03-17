/**
 * Messages API
 * Used by the dashboard frontend to load and manage messages.
 */

const express = require("express");
const router = express.Router();
const { getMessages, markRead, getUnreadCount } = require("../store/messages");

// GET /api/messages?channel=whatsapp|email&limit=50
router.get("/", (req, res) => {
  const { channel, limit } = req.query;
  const messages = getMessages({
    channel: channel || null,
    limit: limit ? parseInt(limit) : 50,
  });
  res.json({ messages, unread: getUnreadCount() });
});

// PATCH /api/messages/:id/read
router.patch("/:id/read", (req, res) => {
  const msg = markRead(req.params.id);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  res.json({ ok: true, message: msg });
});

module.exports = router;
