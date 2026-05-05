# Voice Lab samples

Drop clean audio recordings here, named exactly:

| File | Persona | Recording script suggestion |
|------|---------|------------------------------|
| `prof.mp3` | Nigerian Professor | Read Section A below in measured, lecturing tone. |
| `male.mp3` | Nigerian middle-aged male | Read Section B below in conversational, warm tone. |
| `female.mp3` | Nigerian middle-aged female | Read Section C below in warm, confident tone. |

Recording requirements:
- 60-180 seconds.
- Quiet room, no music, no other voices, no echo.
- Phone mic close to face is fine; AirPods/headset is fine.
- Single take preferred. Trim long silences before saving.
- Export as MP3 (any bitrate >=96kbps) or WAV.

Then run:
```powershell
cd "C:\FTC HOLDING\APPS\saywetin-native\contentops"
npm run voices:clone-upload
```

---

## Section A - Professor script
"Good morning. Today we examine three principles that shape how Nigerian innovators build software for the world. First, build for resilience: the network you assume will not always be there. Second, build for context: the user knows their environment far better than you do. Third, build for trust: nothing else compounds. When these three principles align, products do not merely function - they belong."

## Section B - Male script
"Wetin dey happen, my people. Make I tell you something simple. The phone wey dey your hand right now, e fit do plenty things you no know. Today, I go show you one feature wey go save you time, save you money, and make your life easy small. No long talk. Just watch."

## Section C - Female script
"Hi everyone, and welcome back. Today I want to share something I have been working on for a while. Building tools for our community is not just about the code - it is about understanding the people who will use them. Let me walk you through what we built, why it matters, and how it can help you starting today."
