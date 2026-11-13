import { useCallback, useEffect, useRef, useState } from 'react';
import { EUGENE_PERMA_CATALOG } from './data/catalog.ts';
import type { ChatEntry, EugeneProduct, Language, VoiceStatus } from './types.ts';
import {
  PcmAudioPlayer,
  computeRmsLevel,
  downsampleFloat32,
  float32ToPcm16Base64,
} from './utils/audio.ts';
import { PRODUCT_IMAGES } from './utils/productImages.ts';
import { Header } from './components/Header.tsx';
import { VoiceBrushButton } from './components/VoiceBrushButton.tsx';
import { RecapChatPanel } from './components/RecapChatPanel.tsx';
import { BrandsShowcase } from './components/BrandsShowcase.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';

function formatNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildWelcomeEntry(lang: Language): ChatEntry {
  return lang === 'fr'
    ? {
        id: 'welcome-fr',
        role: 'assistant',
        text: 'Bonjour ! Je suis Camille, votre conseillère Eugène Perma Professionnel. Dites-moi ce que vos cheveux vous racontent aujourd’hui — sécheresse, boucles rebelles, couleur ou volume — et on prend le problème à la racine ensemble.',
        summaryPoints: [
          'Cliquez sur la brosse vocale pour me parler en direct',
          'Ou sélectionnez une problématique pour recevoir votre routine sur-mesure',
        ],
        timestamp: formatNow(),
        source: 'text',
      }
    : {
        id: 'welcome-en',
        role: 'assistant',
        text: 'Bonjour! I am Camille, your Parisian haircare advisor at Eugène Perma Professionnel. Tell me what your hair needs today—hydration, curl definition, blonde toning, or repair—and let’s get straight to the root of it together.',
        summaryPoints: [
          'Tap the vocal brush above to speak with me live',
          'Or type your hair concern below for your Eugène Perma ritual',
        ],
        timestamp: formatNow(),
        source: 'text',
      };
}

function matchProductsFromText(text: string): EugeneProduct[] {
  const lower = text.toLowerCase();
  const matched: EugeneProduct[] = [];
  for (const p of EUGENE_PERMA_CATALOG) {
    const nameFr = p.nameFr.toLowerCase();
    const nameEn = p.nameEn.toLowerCase();
    if (lower.includes(nameFr) || lower.includes(nameEn)) {
      matched.push(p);
    }
    if (matched.length >= 3) break;
  }
  return matched;
}

const QUICK_CONCERNS: Record<Language, Array<{ label: string; prompt: string }>> = {
  fr: [
    {
      label: 'Cheveux secs & cassants',
      prompt: 'Mes cheveux sont secs, fragilisés et cassants. Quelle routine Eugène Perma me conseillez-vous et comment l’appliquer ?',
    },
    {
      label: 'Boucles sans frisottis',
      prompt: 'J’ai les cheveux bouclés avec beaucoup de frisottis. Quels soins Eugène Perma utiliser ?',
    },
    {
      label: 'Blond avec reflets jaunes',
      prompt: 'Mon blond a des reflets jaunes. Quel soin Eugène Perma pour les neutraliser ?',
    },
    {
      label: 'Racines grasses, pointes sèches',
      prompt: 'J’ai les racines qui regraissent vite mais les pointes sèches. Que me conseillez-vous ?',
    },
  ],
  en: [
    {
      label: 'Dry & brittle hair',
      prompt: 'My hair feels dry and breaks easily. Which Eugène Perma routine should I use and how?',
    },
    {
      label: 'Frizz-free curls',
      prompt: 'I have curly hair that gets frizzy in humidity. Which Eugène Perma products do you recommend?',
    },
    {
      label: 'Brassy blonde tones',
      prompt: 'My blonde hair is turning slightly yellow. How can I tone and brighten it with Eugène Perma?',
    },
    {
      label: 'Oily roots, dry ends',
      prompt: 'My scalp gets oily quickly while my ends feel dry. What routine do you suggest?',
    },
  ],
};

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatEntry[]>(() => [buildWelcomeEntry('fr')]);
  const [liveInputDraft, setLiveInputDraft] = useState('');
  const [liveOutputDraft, setLiveOutputDraft] = useState('');
  const [isSendingText, setIsSendingText] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EugeneProduct | null>(null);

  // Refs for WebSocket & WebAudio callbacks to avoid stale closures
  const langRef = useRef<Language>(lang);
  langRef.current = lang;

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<PcmAudioPlayer | null>(null);

  const inputDraftRef = useRef('');
  const outputDraftRef = useRef('');
  const pendingRecRef = useRef<{
    routineTitle?: string;
    summaryPoints?: string[];
    products: EugeneProduct[];
  } | null>(null);

  const cleanupAudioAndSocket = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      void inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      for (const track of micStreamRef.current.getTracks()) {
        track.stop();
      }
      micStreamRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    inputDraftRef.current = '';
    outputDraftRef.current = '';
    pendingRecRef.current = null;
    setLiveInputDraft('');
    setLiveOutputDraft('');
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioAndSocket();
    };
  }, [cleanupAudioAndSocket]);

  const flushTurnToHistory = useCallback(() => {
    const userText = inputDraftRef.current.trim();
    const assistantText = outputDraftRef.current.trim();
    const rec = pendingRecRef.current;

    if (!userText && !assistantText && !rec) return;

    setMessages((prev) => {
      const next = [...prev];
      if (userText) {
        next.push({
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'user',
          text: userText,
          timestamp: formatNow(),
          source: 'voice',
        });
      }

      if (assistantText || (rec && rec.products.length > 0)) {
        const fallbackMatches =
          rec && rec.products.length > 0
            ? rec.products
            : matchProductsFromText(assistantText);

        next.push({
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          text: assistantText,
          routineTitle: rec?.routineTitle,
          summaryPoints: rec?.summaryPoints,
          products: fallbackMatches,
          timestamp: formatNow(),
          source: 'voice',
        });
      }
      return next;
    });

    inputDraftRef.current = '';
    outputDraftRef.current = '';
    pendingRecRef.current = null;
    setLiveInputDraft('');
    setLiveOutputDraft('');
  }, []);

  const startVoiceSession = useCallback(
    async (targetLang: Language) => {
      cleanupAudioAndSocket();
      setErrorBanner(null);
      setVoiceStatus('connecting');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;

        const player = new PcmAudioPlayer((speaking, level) => {
          setVoiceStatus((prev) => {
            if (prev === 'idle' || prev === 'error') return prev;
            return speaking ? 'speaking' : 'listening';
          });
          if (speaking) {
            setAudioLevel(level);
          }
        });
        playerRef.current = player;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/live?lang=${targetLang}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            text?: string;
            audio?: string;
            message?: string;
            routineTitle?: string;
            summaryPoints?: string[];
            products?: EugeneProduct[];
          };

          if (msg.type === 'ready') {
            setVoiceStatus('listening');
          } else if (msg.type === 'inputTranscript' && msg.text) {
            inputDraftRef.current += msg.text;
            setLiveInputDraft(inputDraftRef.current);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            // Once Camille starts responding, commit user's spoken phrase cleanly if not yet flushed
            outputDraftRef.current += msg.text;
            setLiveOutputDraft(outputDraftRef.current);
          } else if (msg.type === 'audio' && msg.audio) {
            playerRef.current?.enqueuePcm24kBase64(msg.audio);
          } else if (msg.type === 'recommendation') {
            pendingRecRef.current = {
              routineTitle: msg.routineTitle,
              summaryPoints: msg.summaryPoints,
              products: msg.products ?? [],
            };
          } else if (msg.type === 'interrupted') {
            playerRef.current?.clearQueue();
            flushTurnToHistory();
            setVoiceStatus('listening');
          } else if (msg.type === 'turnComplete') {
            flushTurnToHistory();
          } else if (msg.type === 'error') {
            setErrorBanner(
              msg.message ??
                (targetLang === 'fr'
                  ? 'Erreur de connexion vocale.'
                  : 'Voice connection error.')
            );
            cleanupAudioAndSocket();
            setVoiceStatus('error');
          } else if (msg.type === 'closed') {
            flushTurnToHistory();
            cleanupAudioAndSocket();
            setVoiceStatus('idle');
          }
        };

        ws.onerror = () => {
          setErrorBanner(
            targetLang === 'fr'
              ? 'Impossible de joindre le serveur vocal.'
              : 'Unable to connect to the voice server.'
          );
          cleanupAudioAndSocket();
          setVoiceStatus('error');
        };

        ws.onopen = () => {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const inputCtx = new AudioCtx({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputCtx;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          // Mute feedback loop by routing through zero-gain node
          const silentGain = inputCtx.createGain();
          silentGain.gain.value = 0;

          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const raw = e.inputBuffer.getChannelData(0);
            const resampled = downsampleFloat32(raw, inputCtx.sampleRate, 16000);
            const level = computeRmsLevel(resampled);
            setAudioLevel((prev) => Math.max(level, prev * 0.65));

            const base64 = float32ToPcm16Base64(resampled);
            ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
          };
        };
      } catch (err) {
        const isPermission =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        setErrorBanner(
          isPermission
            ? targetLang === 'fr'
              ? 'Accès au microphone refusé. Vous pouvez autoriser le micro ou écrire votre question ci-dessous.'
              : 'Microphone access denied. You can enable your mic or type your question below.'
            : targetLang === 'fr'
              ? 'Microphone indisponible sur cet appareil.'
              : 'Microphone unavailable on this device.'
        );
        cleanupAudioAndSocket();
        setVoiceStatus('error');
      }
    },
    [cleanupAudioAndSocket, flushTurnToHistory]
  );

  const stopVoiceSession = useCallback(() => {
    flushTurnToHistory();
    cleanupAudioAndSocket();
    setVoiceStatus('idle');
  }, [cleanupAudioAndSocket, flushTurnToHistory]);

  const handleToggleVoice = () => {
    if (voiceStatus === 'listening' || voiceStatus === 'speaking') {
      stopVoiceSession();
    } else if (voiceStatus === 'idle' || voiceStatus === 'error') {
      void startVoiceSession(lang);
    }
  };

  const handleChangeLang = (newLang: Language) => {
    if (newLang === lang) return;
    const wasActive =
      voiceStatus === 'listening' ||
      voiceStatus === 'speaking' ||
      voiceStatus === 'connecting';

    setLang(newLang);
    setErrorBanner(null);

    if (messages.length === 1 && messages[0].id.startsWith('welcome-')) {
      setMessages([buildWelcomeEntry(newLang)]);
    }

    if (wasActive) {
      flushTurnToHistory();
      void startVoiceSession(newLang);
    }
  };

  const handleSendText = async (text: string) => {
    setErrorBanner(null);

    // If live voice socket is active, send directly through the Live session
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      (voiceStatus === 'listening' || voiceStatus === 'speaking')
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: 'user',
          text,
          timestamp: formatNow(),
          source: 'text',
        },
      ]);
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
      return;
    }

    // Otherwise use /api/chat (gemini-4-hydrogen structured recap)
    const userMsg: ChatEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: formatNow(),
      source: 'text',
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsSendingText(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lang: langRef.current,
          history: historyPayload,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        routineTitle?: string;
        summaryPoints?: string[];
        products?: EugeneProduct[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply ?? '',
          routineTitle: data.routineTitle,
          summaryPoints: data.summaryPoints,
          products: data.products ?? [],
          timestamp: formatNow(),
          source: 'text',
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : lang === 'fr'
            ? 'Erreur lors de la réponse.'
            : 'Unable to reach Camille.';
      setErrorBanner(message);
    } finally {
      setIsSendingText(false);
    }
  };

  const handleResetConversation = () => {
    setMessages([buildWelcomeEntry(lang)]);
    setErrorBanner(null);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isFr = lang === 'fr';

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header
        lang={lang}
        onChangeLang={handleChangeLang}
        onScrollTo={scrollToSection}
      />

      <main className="flex-1">
        {/* Hero / Voice Consultation Atelier */}
        <section
          id="atelier"
          className="relative overflow-hidden border-b border-white/10"
        >
          {/* Subtle Parisian atelier backdrop image with measured contrast scrim */}
          <img
            src={PRODUCT_IMAGES.atelier}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black pointer-events-none"
          />

          <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-16 flex flex-col items-center text-center gap-7">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pale-oak">
                {isFr
                  ? 'Le Club des Frenchies · Conseil Sur-Mesure'
                  : 'Le Club des Frenchies · Tailored Hair Advice'}
              </p>
              <h1 className="font-serif italic text-3xl sm:text-5xl font-medium text-white tracking-tight text-balance">
                {isFr
                  ? 'Votre diagnostic capillaire à la voix'
                  : 'Your Parisian Hair Ritual, Spoken Live'}
              </h1>
              <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-xl mx-auto">
                {isFr
                  ? 'Parlez à Camille de vos besoins capillaires. Elle compose votre routine exclusivement parmi les gammes Eugène Perma Professionnel.'
                  : 'Speak with Camille about your hair concerns. She curates your routine exclusively from Eugène Perma Professionnel Paris.'}
              </p>
            </div>

            {/* Single Focal Anchor: Sculpted Hairbrush + Mic Button */}
            <VoiceBrushButton
              lang={lang}
              status={voiceStatus}
              audioLevel={audioLevel}
              onToggle={handleToggleVoice}
            />

            {errorBanner && (
              <div
                role="alert"
                className="max-w-lg px-4 py-2.5 rounded-xl bg-amber-950/60 border border-amber-400/40 text-xs text-amber-200"
              >
                {errorBanner}
              </div>
            )}

            {/* Quick Problem Starters */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-2xl">
              {QUICK_CONCERNS[lang].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    void handleSendText(item.prompt);
                    scrollToSection('recap-chat');
                  }}
                  className="px-4 py-2 rounded-full bg-white/8 hover:bg-pale-oak hover:text-black border border-white/12 text-xs font-medium text-white/85 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Recap Chatbot with Summarized Answers & Product Photos */}
        <div className="pt-8">
          <RecapChatPanel
            lang={lang}
            messages={messages}
            liveInputDraft={liveInputDraft}
            liveOutputDraft={liveOutputDraft}
            isSendingText={isSendingText}
            onSendText={(txt) => void handleSendText(txt)}
            onSelectProduct={setSelectedProduct}
            onResetConversation={handleResetConversation}
          />
        </div>

        {/* Curated Eugène Perma Brands Explorer */}
        <BrandsShowcase lang={lang} onSelectProduct={setSelectedProduct} />
      </main>

      <footer className="bg-black border-t border-white/10 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/55">
          <span className="font-serif italic text-sm text-pale-oak">
            Eugène Perma Professionnel Paris
          </span>
          <span>
            {isFr
              ? 'Depuis 1919 · Savoir-faire capillaire français · Essentiel, Collections Nature, Artist(e), Blush Care, Solaris & ApHogee'
              : 'Since 1919 · French Haircare Craftsmanship · Essentiel, Collections Nature, Artist(e), Blush Care, Solaris & ApHogee'}
          </span>
        </div>
      </footer>

      <ProductDetailModal
        product={selectedProduct}
        lang={lang}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
