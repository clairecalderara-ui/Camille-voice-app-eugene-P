import { Loader2, Square } from 'lucide-react';
import type { Language, VoiceStatus } from '../types.ts';

interface VoiceBrushButtonProps {
  lang: Language;
  status: VoiceStatus;
  audioLevel: number;
  onToggle: () => void;
}

export function VoiceBrushButton({
  lang,
  status,
  audioLevel,
  onToggle,
}: VoiceBrushButtonProps) {
  const isFr = lang === 'fr';
  const isActive = status === 'listening' || status === 'speaking';
  const isConnecting = status === 'connecting';

  const outerScale = isActive ? 1 + Math.min(0.28, audioLevel * 0.35) : 1;
  const innerScale = isActive ? 1 + Math.min(0.16, audioLevel * 0.2) : 1;

  const statusLabel = (() => {
    if (status === 'connecting') {
      return isFr ? 'Connexion à Camille...' : 'Connecting to Camille...';
    }
    if (status === 'listening') {
      return isFr
        ? 'Camille vous écoute — parlez librement'
        : 'Camille is listening — speak naturally';
    }
    if (status === 'speaking') {
      return isFr ? 'Camille vous conseille...' : 'Camille is speaking...';
    }
    if (status === 'error') {
      return isFr
        ? 'Connexion interrompue — appuyez pour réessayer'
        : 'Connection interrupted — tap to retry';
    }
    return isFr
      ? 'Appuyez sur la brosse pour démarrer'
      : 'Tap the hairbrush to start speaking';
  })();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Acoustic resonance rings driven strictly by transform & opacity */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-pale-oak/35 transition-transform duration-150 ease-out pointer-events-none"
          style={{
            transform: `scale(${outerScale})`,
            opacity: isActive ? 0.65 : 0,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-pale-oak/15 transition-transform duration-150 ease-out pointer-events-none"
          style={{
            transform: `scale(${innerScale})`,
            opacity: isActive ? 0.8 : 0,
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={isConnecting}
          aria-label={
            isActive
              ? isFr
                ? 'Arrêter la consultation vocale'
                : 'Stop voice consultation'
              : isFr
                ? 'Démarrer la consultation vocale avec Camille'
                : 'Start voice consultation with Camille'
          }
          className={`group relative z-10 w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pale-oak cursor-pointer ${
            isActive
              ? 'bg-pale-oak text-black shadow-[0_0_50px_rgba(203,195,181,0.35)] scale-[1.02]'
              : 'bg-[#141414] text-pale-oak border border-pale-oak/50 hover:border-pale-oak hover:scale-[1.03] shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
          }`}
        >
          {isConnecting ? (
            <Loader2 className="w-11 h-11 animate-spin" />
          ) : (
            /* Sculpted Hairbrush + Acoustic Mic Emblem */
            <svg
              viewBox="0 0 80 80"
              fill="none"
              className="w-16 h-16 sm:w-[72px] sm:h-[72px] transition-transform duration-200 group-hover:-translate-y-0.5"
              aria-hidden="true"
            >
              {/* Oval paddle brush head */}
              <ellipse
                cx="40"
                cy="29"
                rx="17"
                ry="21"
                stroke="currentColor"
                strokeWidth="2.4"
              />
              {/* Inner acoustic mic capsule & bristles motif */}
              <rect
                x="34"
                y="18"
                width="12"
                height="19"
                rx="6"
                fill="currentColor"
                fillOpacity={isActive ? '0.22' : '0.16'}
                stroke="currentColor"
                strokeWidth="1.8"
              />
              {/* Fine bristle dots arranged cleanly */}
              <circle cx="30" cy="22" r="1.4" fill="currentColor" />
              <circle cx="50" cy="22" r="1.4" fill="currentColor" />
              <circle cx="28" cy="29" r="1.4" fill="currentColor" />
              <circle cx="52" cy="29" r="1.4" fill="currentColor" />
              <circle cx="30" cy="36" r="1.4" fill="currentColor" />
              <circle cx="50" cy="36" r="1.4" fill="currentColor" />
              {/* Mic acoustic grille lines */}
              <line
                x1="37"
                y1="24"
                x2="43"
                y2="24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="37"
                y1="28"
                x2="43"
                y2="28"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="37"
                y1="32"
                x2="43"
                y2="32"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Sculpted brush handle */}
              <path
                d="M36 50V66C36 68.2091 37.7909 70 40 70C42.2091 70 44 68.2091 44 66V50"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          )}

          <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">
            {isActive ? (
              <>
                <Square className="w-2.5 h-2.5 fill-current" />
                {isFr ? 'Terminer' : 'End'}
              </>
            ) : isConnecting ? (
              isFr ? 'Patientez' : 'Wait'
            ) : (
              isFr ? 'Consulter' : 'Consult'
            )}
          </span>
        </button>
      </div>

      <p
        aria-live="polite"
        className={`text-sm font-medium tracking-wide text-center transition-colors ${
          isActive
            ? 'text-pale-oak'
            : status === 'error'
              ? 'text-amber-300'
              : 'text-white/75'
        }`}
      >
        {statusLabel}
      </p>
    </div>
  );
}
