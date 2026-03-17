# Unified Inbox — Setup Guide

Combines **WhatsApp Business API** (Jasper's Market) + **Gmail** into one real-time dashboard.

---

## Architecture

```
WhatsApp message → Meta webhook → POST /webhooks/whatsapp ─┐
                                                            ├─→ store → WebSocket → Dashboard
Gmail message    → Pub/Sub push  → POST /webhooks/gmail   ─┘
```

---

## Prerequisites

- Node.js 18+
- ngrok (for local webhook testing)
- Google account: skander.hage@gmail.com
- Meta Developer account

---

## Step 1 — Install dependencies

```bash
npm install
cp .env.example .env
```

---

## Step 2 — Gmail API Setup

### 2a. Google Cloud Console
1. Go to https://console.cloud.google.com
2. Create a new project (e.g. "unified-inbox")
3. Enable **Gmail API**: APIs & Services → Enable APIs → search "Gmail API"
4. Enable **Cloud Pub/Sub API**: same way
5. Create OAuth2 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
   - Copy **Client ID** and **Client Secret** to `.env`

### 2b. Create Pub/Sub topic
```bash
# Install gcloud CLI first: https://cloud.google.com/sdk/docs/install
gcloud pubsub topics create gmail-inbox
gcloud pubsub subscriptions create gmail-inbox-sub \
  --topic=gmail-inbox \
  --push-endpoint=https://YOUR_NGROK_URL.ngrok.io/webhooks/gmail \
  --ack-deadline=10
```

Grant Gmail permission to publish to your topic:
```bash
gcloud pubsub topics add-iam-policy-binding gmail-inbox \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

Set in `.env`:
```
PUBSUB_TOPIC_NAME=projects/YOUR_PROJECT_ID/topics/gmail-inbox
```

### 2c. Get your Gmail refresh token
```bash
npm run get-token
```
Follow the prompts — authorize with skander.hage@gmail.com, paste the refresh token in `.env`.

---

## Step 3 — WhatsApp Business API Setup

Follow the Jasper's Market README for the Meta side:
https://github.com/fbsamples/whatsapp-business-jaspers-market

Key `.env` values needed:
```
WHATSAPP_VERIFY_TOKEN=my_verify_token   # any string you choose
WHATSAPP_ACCESS_TOKEN=                  # from Meta dashboard
WHATSAPP_PHONE_NUMBER_ID=               # from Meta dashboard
```

---

## Step 4 — Run locally

### Terminal 1 — ngrok
```bash
ngrok http 3000
# Copy the https URL, e.g. https://abc123.ngrok.io
# Update NGROK_URL in .env
# Also update your Pub/Sub push endpoint (Step 2b) and Meta webhook URL
```

### Terminal 2 — Server
```bash
npm run dev
```

Open http://localhost:3000 — the dashboard will show all incoming messages live.

---

## Step 5 — Test it

**Test Gmail:**
Send an email to skander.hage@gmail.com from any account — it should appear in the dashboard within seconds.

**Test WhatsApp:**
Send a WhatsApp message to your business number — it appears alongside emails in the same inbox.

---

## Later: Add Allianz email forwarding

Once the prototype works, add a Gmail filter:
1. Gmail Settings → Filters → Create new filter
2. From: `*@allianz.de` (or specific sender)
3. Action: "Forward to" → add your other inbox address

No code changes needed — Gmail will push those emails through the same pipeline.

---

## File structure

```
unified-inbox/
├── server.js                  # Main entry point
├── package.json
├── .env.example
├── public/
│   └── index.html             # Dashboard frontend
├── routes/
│   ├── whatsapp.js            # Meta webhook handler
│   ├── gmail.js               # Pub/Sub push handler
│   └── messages.js            # REST API
├── services/
│   └── gmailService.js        # Gmail API + OAuth2
├── store/
│   └── messages.js            # In-memory store (swap for DB later)
└── scripts/
    └── get-gmail-token.js     # One-time OAuth token helper
```
