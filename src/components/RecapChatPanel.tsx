import { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import type { ChatEntry, EugeneProduct, Language } from '../types.ts';
import { ProductCard } from './ProductCard.tsx';

interface RecapChatPanelProps {
  lang: Language;
  messages: ChatEntry[];
  liveInputDraft: string;
  liveOutputDraft: string;
  isSendingText: boolean;
  onSendText: (text: string) => void;
  onSelectProduct: (product: EugeneProduct) => void;
  onResetConversation: () => void;
}

export function RecapChatPanel({
  lang,
  messages,
  liveInputDraft,
  liveOutputDraft,
  isSendingText,
  onSendText,
  onSelectProduct,
  onResetConversation,
}: RecapChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const feedRef = useRef<HTMLDivElement | null>(null);
  const isFr = lang === 'fr';

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, liveInputDraft, liveOutputDraft]);

  // Deduplicate recommended products across the conversation for the quick Routine bar
  const prescribedProducts: EugeneProduct[] = [];
  const seenIds = new Set<string>();
  for (const entry of messages) {
    for (const prod of entry.products ?? []) {
      if (!seenIds.has(prod.id)) {
        seenIds.add(prod.id);
        prescribedProducts.push(prod);
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSendingText) return;
    onSendText(trimmed);
    setInputValue('');
  };

  return (
    <section
      id="recap-chat"
      className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-2"
      aria-label={isFr ? 'Récapitulatif écrit et produits conseillés' : 'Written recap and recommended products'}
    >
      <div className="bg-[#111111] border border-white/12 rounded-3xl overflow-hidden shadow-2xl">
        {/* Panel Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-pale-oak text-black flex items-center justify-center font-serif italic font-bold text-base shrink-0">
              C
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {isFr
                  ? 'Carnet de Routine & Récapitulatif Camille'
                  : 'Camille’s Written Routine Recap'}
              </h2>
              <p className="text-xs text-white/55 truncate">
                {isFr
                  ? 'Synthèse de vos échanges et ordonnance Eugène Perma Professionnel'
                  : 'Summarized answers & tailored Eugène Perma Professionnel prescription'}
              </p>
            </div>
          </div>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={onResetConversation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isFr ? 'Nouvelle consultation' : 'New consultation'}
            </button>
          )}
        </div>

        {/* Scrollable Transcript + Product Photo Cards */}
        <div
          ref={feedRef}
          className="px-5 sm:px-7 py-6 space-y-6 max-h-[540px] overflow-y-auto"
        >
          {messages.map((entry) => {
            if (entry.role === 'user') {
              return (
                <div key={entry.id} className="flex justify-end">
                  <div className="max-w-lg px-4 py-3 rounded-2xl rounded-br-sm bg-pale-oak text-black text-sm font-medium leading-relaxed">
                    {entry.text}
                  </div>
                </div>
              );
            }

            return (
              <div key={entry.id} className="space-y-4">
                <div className="max-w-2xl bg-[#191919] border border-white/10 rounded-2xl rounded-bl-sm p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                    <span className="font-semibold text-pale-oak">Camille</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.timestamp}</span>
                  </div>

                  {entry.routineTitle && (
                    <h3 className="font-serif italic text-lg text-white">
                      {entry.routineTitle}
                    </h3>
                  )}

                  {entry.text && (
                    <p className="text-sm text-white/85 leading-relaxed">{entry.text}</p>
                  )}

                  {entry.summaryPoints && entry.summaryPoints.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-pale-oak">
                        {isFr ? 'L’essentiel à retenir' : 'Key Takeaways'}
                      </p>
                      <ul className="space-y-1.5">
                        {entry.summaryPoints.map((pt, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs sm:text-[13px] text-white/80 leading-relaxed"
                          >
                            <span className="text-pale-oak mt-0.5" aria-hidden="true">
                              •
                            </span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Product Photos & Cards recommended in this turn */}
                {entry.products && entry.products.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                    {entry.products.map((prod) => (
                      <ProductCard
                        key={`${entry.id}-${prod.id}`}
                        product={prod}
                        lang={lang}
                        onSelect={onSelectProduct}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Live streaming drafts while speaking */}
          {liveInputDraft && (
            <div className="flex justify-end">
              <div className="max-w-lg px-4 py-3 rounded-2xl rounded-br-sm bg-pale-oak/75 text-black text-sm leading-relaxed">
                {liveInputDraft}
              </div>
            </div>
          )}

          {liveOutputDraft && (
            <div className="max-w-2xl bg-[#191919] border border-pale-oak/35 rounded-2xl rounded-bl-sm p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-pale-oak font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isFr ? 'Camille répond en direct...' : 'Camille speaking live...'}</span>
              </div>
              <p className="text-sm text-white/85 leading-relaxed">{liveOutputDraft}</p>
            </div>
          )}

          {isSendingText && (
            <div className="flex items-center gap-2 text-xs text-pale-oak">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {isFr
                  ? 'Camille prépare votre routine Eugène Perma...'
                  : 'Camille is preparing your Eugène Perma ritual...'}
              </span>
            </div>
          )}
        </div>

        {/* Summary strip of all prescribed products in this session */}
        {prescribedProducts.length > 0 && (
          <div className="px-6 py-3.5 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-white/75">
              <span className="font-semibold text-pale-oak">
                {isFr ? 'Votre sélection :' : 'Your selection:'}
              </span>
              <span className="tabular-nums">
                {prescribedProducts.length}{' '}
                {isFr
                  ? prescribedProducts.length > 1
                    ? 'soins Eugène Perma'
                    : 'soin Eugène Perma'
                  : prescribedProducts.length > 1
                    ? 'Eugène Perma products'
                    : 'Eugène Perma product'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {prescribedProducts.map((p) => (
                <button
                  key={`chip-${p.id}`}
                  type="button"
                  onClick={() => onSelectProduct(p)}
                  className="px-3 py-1 rounded-full bg-white/8 hover:bg-pale-oak hover:text-black text-xs font-medium text-white/85 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isFr ? p.nameFr : p.nameEn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Text Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="px-4 sm:px-6 py-4 border-t border-white/10 bg-black/70 flex items-center gap-3"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isFr
                ? 'Ou posez votre question par écrit (ex : mes pointes sont sèches et cassantes)...'
                : 'Or type your hair question here (e.g. dry ends & frizz)...'
            }
            className="flex-1 bg-[#181818] border border-white/15 focus:border-pale-oak rounded-full px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSendingText}
            aria-label={isFr ? 'Envoyer le message' : 'Send message'}
            className="w-11 h-11 rounded-full bg-pale-oak hover:bg-pale-oak-hover disabled:opacity-40 text-black flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
