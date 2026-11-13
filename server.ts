import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  FunctionDeclaration,
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';
import {
  EUGENE_PERMA_CATALOG,
  buildCatalogSummaryForPrompt,
  findProductsByIds,
} from './src/data/catalog.ts';
import type { Language } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const recommendProductsDeclaration: FunctionDeclaration = {
  name: 'recommend_products',
  description:
    'Publishes the recommended Eugène Perma Professionnel products with photos and a concise written routine summary to the client recap panel below.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      routineTitle: {
        type: Type.STRING,
        description:
          'Short, elegant title for this personalized routine in the active language (e.g., "Rituel Réparation Kératine" or "Hydration & Curl Ritual").',
      },
      summaryPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          '2 to 4 concise bullet points summarizing the diagnosis, routine order, and usage tip.',
      },
      productIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          'Exact product IDs from the Eugène Perma Professionnel catalog (1 to 4 products maximum).',
      },
    },
    required: ['routineTitle', 'summaryPoints', 'productIds'],
  },
};

function buildCamilleSystemPrompt(lang: Language): string {
  const catalogText = buildCatalogSummaryForPrompt();

  const personaCore =
    lang === 'fr'
      ? `Tu es Camille, maîtresse-conseillère capillaire parisienne pour la Maison Eugène Perma Professionnel (fondée en 1919).
LANGUE & TON :
- Parle exclusivement en français (sauf si le client te demande explicitement un mot anglais).
- Tu es une femme sûre de son expertise, chaleureuse, cordiale, raffinée et pleine d'esprit.
- De temps en temps (avec parcimonie et élégance, jamais à chaque phrase), glisse un jeu de mots raffiné autour des cheveux ou de la coiffure (ex. : « On va prendre le problème à la racine », « Pas besoin de se couper les cheveux en quatre », « Ça tombe à pic, ou plutôt à brosse ! », « Pour des boucles qui gardent leur ressort sans tirage par les cheveux »).
- Sois claire, vivante et concise à l'oral (3 à 5 phrases par prise de parole), structurée comme une vraie consultation en salon : diagnostic rapide, routine étape par étape (Laver -> Traiter -> Sublimer/Coiffer), et mode d'emploi précis.`
      : `You are Camille, Parisian master haircare advisor at Maison Eugène Perma Professionnel (founded in 1919).
LANGUAGE & VOICE STYLE:
- Speak fluent, articulate, effortless English, while keeping a subtle, charming French touch in your phrasing and cadence—natural and polished, never broken or caricatured (e.g., an occasional natural "Alors...", "Voilà", "Très chic", or "C'est la base").
- You have the exact same confident, warm, cordial, witty personality as in French.
- From time to time (tastefully and sparingly, never forced), weave in a refined hair pun (e.g., "Let's get straight to the root of the matter", "No need to split hairs over this", "Consider this a brush with brilliance").
- Keep spoken answers lively, warm, and crisp (3 to 5 sentences per turn), structured like an intimate Parisian salon consultation: quick diagnosis, step-by-step routine, and exact application tip.`;

  return `${personaCore}

RÈGLE D'EXCLUSIVITÉ ABSOLUE / STRICT BRAND EXCLUSIVITY:
- Tu conseilles UNIQUEMENT les produits Eugène Perma Professionnel et les marques appartenant à Eugène Perma : ESSENTIEL, COLLECTIONS NATURE, ARTIST(E), BLUSH CARE, BLUSH SATINE, SOLARIS, APHOGEE et CARMEN RITUEL.
- Ne mentionne JAMAIS aucune autre marque extérieure ou concurrente, même si le client en cite une. Si un client mentionne une marque externe, réponds avec élégance et humour que tu officies exclusivement pour la Maison Eugène Perma Professionnel depuis 1919 et propose immédiatement l'équivalent exact dans notre catalogue.
- N'invente jamais de produits hors catalogue. Utilise uniquement les références officielles ci-dessous.

OUTIL OBLIGATOIRE / MANDATORY TOOL:
- Dès que tu conseilles des produits ou une routine pour le problème du client, appelle TOUJOURS l'outil \`recommend_products\` avec les IDs exacts du catalogue (1 à 4 produits complémentaires), un \`routineTitle\` élégant et 2 à 4 \`summaryPoints\` synthétiques dans la langue de la conversation. Cela affiche automatiquement les fiches récapitulatives et les photos des produits dans le chatbot en bas de l'écran.

CATALOGUE OFFICIEL EUGÈNE PERMA PROFESSIONNEL :
${catalogText}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/catalog', (_req, res) => {
    res.json({ products: EUGENE_PERMA_CATALOG });
  });

  // Text chatbot fallback & structured recap endpoint using gemini-4-hydrogen
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, lang = 'fr', history = [] } = req.body as {
        message?: string;
        lang?: Language;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      };

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const ai = getAiClient();
      const activeLang: Language = lang === 'en' ? 'en' : 'fr';
      const catalogText = buildCatalogSummaryForPrompt();

      const recentContext = history
        .slice(-6)
        .map((h) => `${h.role === 'user' ? 'Client' : 'Camille'}: ${h.text}`)
        .join('\n');

      const prompt = recentContext
        ? `Historique récent:\n${recentContext}\n\nNouvelle question client: ${message}`
        : message;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `${buildCamilleSystemPrompt(activeLang)}

IMPORTANT POUR LE CHATBOT ÉCRIT :
Réponds au format JSON structuré avec :
- "reply": ta réponse chaleureuse, experte et concise (avec à l'occasion un jeu de mots capillaire raffiné).
- "routineTitle": un titre court de routine (ex: "Rituel Douceur & Boucles").
- "summaryPoints": 2 à 4 points clés très synthétiques (diagnostic + geste d'application).
- "recommendedProductIds": liste des IDs exacts issus de ce catalogue (1 à 4 max) correspondant au besoin :
${catalogText}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              routineTitle: { type: Type.STRING },
              summaryPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['reply', 'routineTitle', 'summaryPoints', 'recommendedProductIds'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        reply?: string;
        routineTitle?: string;
        summaryPoints?: string[];
        recommendedProductIds?: string[];
      };

      const products = findProductsByIds(parsed.recommendedProductIds ?? []);

      res.json({
        reply: parsed.reply ?? '',
        routineTitle: parsed.routineTitle ?? '',
        summaryPoints: parsed.summaryPoints ?? [],
        products,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur serveur Gemini.';
      console.error('/api/chat error:', error);
      res.status(500).json({ error: msg });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs, req) => {
    const url = new URL(req.url ?? '/live', `http://${req.headers.host ?? 'localhost'}`);
    const langParam = url.searchParams.get('lang');
    const lang: Language = langParam === 'en' ? 'en' : 'fr';

    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let isClosed = false;

    const sendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      const ai = getAiClient('v1beta');

      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [recommendProductsDeclaration] }],
          systemInstruction: buildCamilleSystemPrompt(lang),
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;

            if (content?.inputTranscription?.text) {
              sendToClient({
                type: 'inputTranscript',
                text: content.inputTranscription.text,
              });
            }

            if (content?.outputTranscription?.text) {
              sendToClient({
                type: 'outputTranscript',
                text: content.outputTranscription.text,
              });
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendToClient({
                  type: 'audio',
                  audio: part.inlineData.data,
                });
              }
            }

            if (content?.interrupted) {
              sendToClient({ type: 'interrupted' });
            }

            if (content?.turnComplete) {
              sendToClient({ type: 'turnComplete' });
            }

            if (message.toolCall?.functionCalls?.length) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === 'recommend_products') {
                  const args = (call.args ?? {}) as {
                    routineTitle?: string;
                    summaryPoints?: string[];
                    productIds?: string[];
                  };
                  const matchedProducts = findProductsByIds(args.productIds ?? []);
                  sendToClient({
                    type: 'recommendation',
                    routineTitle: args.routineTitle ?? '',
                    summaryPoints: args.summaryPoints ?? [],
                    products: matchedProducts,
                  });

                  session?.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          displayed: true,
                          count: matchedProducts.length,
                          productNames: matchedProducts.map((p) =>
                            lang === 'fr' ? p.nameFr : p.nameEn
                          ),
                        },
                      },
                    ],
                  });
                }
              }
            }
          },
          onerror: (err) => {
            console.error('Gemini Live error:', err);
            sendToClient({
              type: 'error',
              message:
                lang === 'fr'
                  ? 'Connexion vocale interrompue. Veuillez réessayer.'
                  : 'Voice connection error. Please try again.',
            });
          },
          onclose: () => {
            if (!isClosed) {
              sendToClient({ type: 'closed' });
            }
          },
        },
      });

      sendToClient({ type: 'ready', lang });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to start voice session.';
      console.error('Live connect failed:', error);
      sendToClient({ type: 'error', message: msg });
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session || isClosed) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
        };

        if (msg.type === 'audio' && msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.type === 'text' && msg.text) {
          session.sendRealtimeInput({ text: msg.text });
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      try {
        session?.close();
      } catch {
        // ignore close error
      }
      session = null;
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Eugène Perma Professionnel Voice Advisor running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
