# Shango ⚡

A voice assistant that lives in your browser, named after **Ṣàngó**, the Yoruba orisha of thunder and lightning and legendary fourth Alaafin of the Oyo Empire.

Say "Shango" and the bàtá drums build, thunder cracks, and a 3D lightning core comes alive. Ask him to research a topic and a wall of panels rises with briefs, key figures and charts.

## Features

- **Wake sequence:** say or type "Shango" to hear the drums and thunder, see the core awaken, and bring up demo screens.
- **Voice mode:** tap the mic once. Say "Shango" to wake him, then just talk, hands-free. Say "goodbye" (or stay quiet for a minute) and he rests until you call his name again.
- **Live research wall:** "Research Lagos" opens a wall that fills as each open source connects: Wikipedia, Wikidata facts, an OpenStreetMap location with Google Maps and satellite links, live weather at the place, Wikimedia Commons imagery, World Bank statistics (for countries), GDELT news coverage from the last 30 days, Wikipedia reader interest, and AI analyst briefs written only from what was gathered.
- **Tools:** weather for any city, Wikipedia lookups, a calculator, world time, timers and session notes.
- **No memory kept:** conversations live only in the open tab. Refresh or close it and everything is gone.

## How it works

| Part | What it does |
|---|---|
| `index.html` | The whole interface: 3D core (Three.js), voice, drums (Web Audio), tools and research wall |
| `api/brain.js` | A Vercel function that keeps the Groq API key secret and sends chat to the AI model |
| `package.json` | Tells Vercel the project uses modern JavaScript |

The AI model is `openai/gpt-oss-120b` on Groq's free tier. Every research source is free and needs no key: Wikipedia, Wikidata, Wikimedia Commons, Wikimedia pageviews, OpenStreetMap, Open-Meteo, the World Bank API and the GDELT Project. GDELT and the World Bank are fetched through `api/brain.js`, which only ever calls those two fixed addresses.

## Deploy on Vercel

1. Get a free API key at [console.groq.com](https://console.groq.com) → **API Keys**.
2. Import this repo at [vercel.com](https://vercel.com) → **Add New → Project**.
3. If the files are inside the `shango-vercel` folder, set **Settings → Build and Deployment → Root Directory** to `shango-vercel`.
4. Leave **Framework Preset** as **Other**.
5. Add the environment variable `GROQ_API_KEY` with your key.
6. Deploy, then open the link in Chrome or Edge.

Any change pushed to GitHub redeploys automatically. After changing an environment variable, redeploy once.

### Environment variables

| Name | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes | Your Groq API key |
| `MODEL` | No | Use a different Groq model, e.g. `openai/gpt-oss-20b` |
| `ALLOWED_ORIGINS` | No | Extra websites allowed to call the brain (your own site is always allowed) |

## Limits

- Groq's free tier allows about 30 requests a minute, 1,000 a day, and 8,000 tokens a minute.
- Each visitor is limited to about 15 messages a minute to protect that quota.
- Voice input needs Chrome, Edge or recent Safari. Firefox users can type.
- His voice comes from the visitor's built-in browser voices, so it sounds different on each device.
- Vercel's free Hobby plan is for personal, non-commercial projects.

## Troubleshooting

| What you see | Fix |
|---|---|
| `404 NOT_FOUND` page | Set **Root Directory** to the folder that holds `index.html`, then redeploy |
| "Groq returned 404" | The model was retired. Set `MODEL` to a current model from the Groq console |
| "Groq returned 401" | The API key is missing or wrong. Check `GROQ_API_KEY`, then redeploy |
| "Free-tier limit" | Wait a minute and try again |
| Mic does nothing | Allow the microphone for the site in your browser settings |
| He doesn't wake | Watch the bottom-left line: it shows what the browser heard. Say "Shango" clearly, or "hey Shango" |
| News panel empty | GDELT limits rapid requests. Wait a few seconds and research again |

## A note on the name

Ṣàngó is still honoured today in Yoruba religion in Nigeria, and in Candomblé and Santería across the diaspora. This project draws on his symbols with respect: the double-headed axe (oṣé), his colours red and white, and the bàtá drums.
