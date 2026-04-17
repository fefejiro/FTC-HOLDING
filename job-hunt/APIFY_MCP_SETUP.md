# 🔌 Apify MCP Setup Guide

> One-time setup. Takes ~5 minutes. Free tier is enough.

---

## STEP 1 — Get Your Free Apify API Token

1. Go to → **https://console.apify.com/sign-up**
2. Sign up with Google or email (free, no credit card needed)
3. Once logged in, go to → **https://console.apify.com/account/integrations**
4. Under **"Personal API tokens"** → click **"+ Add new token"**
5. Name it: `job-hunt-mcp`
6. Copy the token — it looks like: `apify_api_xxxxxxxxxxxxxxxxxxxx`

---

## STEP 2 — Add Token to Cline MCP Settings

Open this file in VS Code:

```
%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

**Or run this in terminal:**
```
code "%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"
```

Replace the contents with:

```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server"],
      "env": {
        "APIFY_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with your actual token.

---

## STEP 3 — Verify It Works

1. Restart VS Code (or reload the Cline extension)
2. Open Cline
3. You should see the Apify MCP tools available
4. Test with: *"Use the Apify MCP to fetch the content of https://example.com"*

---

## What Apify MCP Can Do For Your Job Hunt

| Task | How to use |
|------|-----------|
| Extract job posting data | Give it a LinkedIn/Indeed/Greenhouse URL |
| Scrape company website | Give it the company's homepage URL |
| Pull structured content | Returns clean text you can work with |

---

## Free Tier Limits

- **$5 free credits** on signup
- Each web scrape costs ~$0.001–$0.01
- That's **500–5,000 extractions** for free
- More than enough for your job hunt

---

## Troubleshooting

**"npx not found"** → Make sure Node.js is installed: `node --version`

**"APIFY_TOKEN invalid"** → Double-check you copied the full token from the Apify console

**MCP not showing in Cline** → Restart VS Code completely, not just reload window

---

## Once Setup Is Complete

Go to `job-hunt/prompts/templates.md` and start with **STEP 1 — Job Lead Extraction**.

Paste the prompt into Cline, give it a job URL, and watch it extract structured data automatically.

---

*You're one token away from having a fully operational job-hunt machine.*
