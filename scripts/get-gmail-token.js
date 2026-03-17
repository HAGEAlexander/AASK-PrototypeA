/**
 * Run this ONCE to get your Gmail OAuth refresh token.
 * Usage: node scripts/get-gmail-token.js
 *
 * It will open a browser URL — paste it in, authorize,
 * then paste the code back in the terminal.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { google } = require("googleapis");
const readline = require("readline");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // force refresh_token to be returned
});

console.log("\n1. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Authorize with skander.hage@gmail.com");
console.log("3. Paste the code from the redirect URL below\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter the authorization code: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\n✅ Success! Add these to your .env file:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\nKeep this token safe — it gives read access to your Gmail.");
  } catch (err) {
    console.error("Error getting token:", err.message);
  }
});
