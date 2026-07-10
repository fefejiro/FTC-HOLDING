# Una Labs Social Caption-Only Handoff

Date: 2026-07-10

## Decision

Pause image generation and carousel work for now.

The current Una Labs social system should write clean, human-readable AI and technology news captions only. It should not spend OpenAI/image credits unless that is explicitly turned back on.

## Current Schedule

One weekday run:

```text
12:30 PM Eastern
```

Scheduled task:

```text
UnaLabsSocial-PeakCaption
```

Register:

```powershell
cd "C:\FTC HOLDING\APPS\una-social-agent"
npm run schedule:register
```

## What The Run Does

The scheduled runner creates:

```text
content/captions/YYYY-MM-DD/caption-pack.md
content/captions/YYYY-MM-DD/caption-pack.json
```

It writes:

- one Instagram caption
- one LinkedIn caption
- source details
- a simple LinkedIn text map
- checks showing no image generation was used

## LinkedIn Standard

LinkedIn posts should explain the news plainly and include a small text map:

```text
Simple map:
Source -> what changed -> why it matters

How I would read it:
1. Check the source.
2. Ask what changed.
3. Ask who this helps.
4. Test one real workflow before trusting the hype.
```

This replaces busy diagrams, charts, tiny labels, and over-designed visuals.

## Instagram Standard

Instagram captions should be short, simple, and understandable.

Instagram cannot publish text-only as a normal feed post. For now, the system prepares the caption. Posting to Instagram still needs an approved image, carousel, or reel.

## Guardrails

- No image generation by default.
- No OpenAI API calls by default.
- No automatic browser publishing by default.
- No fake urgency.
- No confusing brand labels on the content.
- Source must be included.
- Language should sound like a real person explaining the news.

## Useful Commands

Create today’s caption pack:

```powershell
npm run caption:write
```

Create a caption pack from a specific story:

```powershell
npm run caption:write -- --title "Meta opened a new AI lane for developers" --source "Meta AI Blog" --url "https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/" --summary "Meta released Muse Spark 1.1 and opened developer access through the Meta Model API."
```

Run the scheduled workflow manually:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\social-run.ps1 -CaptionOnly
```

## Next Step Later

After one week of useful captions, decide whether to restart visuals with a stricter template or keep LinkedIn as text/link posts and use Instagram only when there is a strong asset.
