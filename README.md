# Shango ⚡

<img width="1602" height="1057" alt="image" src="https://github.com/user-attachments/assets/69fd24f8-dfeb-46bc-9262-79cb0c5ff13b" />


A voice assistant that lives in your browser, named after **Ṣàngó**, the Yoruba orisha of thunder and lightning and legendary fourth Alaafin of the Oyo Empire.

Say "Shango" and the bàtá drums build, thunder cracks, and a 3D lightning core comes alive. Ask him to research a topic and a wall of panels rises with briefs, key figures and charts.

## Features

- **Wake sequence:** say or type "Shango" to hear the drums and thunder, see the core awaken, and bring up demo screens.
- **Voice in and out:** talk with the mic, and he answers aloud. You can also type.
- **Research wall:** "Research the Benin Bronzes" pulls Wikipedia articles and turns them into briefs, figures, charts and images.
- **Tools:** weather for any city, Wikipedia lookups, a calculator, world time, timers and session notes.
- **No memory kept:** conversations live only in the open tab. Refresh or close it and everything is gone.


<img width="1784" height="887" alt="image" src="https://github.com/user-attachments/assets/d6ca50b1-a3c5-4664-bfc7-66f1bf8b6c0b" />


## How it works

| Part | What it does |
|---|---|
| `index.html` | The whole interface: 3D core (Three.js), voice, drums (Web Audio), tools and research wall |
| `api/brain.js` | A Vercel function that keeps the Groq API key secret and sends chat to the AI model |
| `package.json` | Tells Vercel the project uses modern JavaScript |

The AI model is `openai/gpt-oss-120b` on Groq's free tier. Weather (Open-Meteo) and Wikipedia are free and need no keys.

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

## A note on the name

Ṣàngó is still honoured today in Yoruba religion in Nigeria, and in Candomblé and Santería across the diaspora. This project draws on his symbols with respect: the double-headed axe (oṣé), his colours red and white, and the bàtá drums.
