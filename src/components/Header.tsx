import type { Language } from '../types.ts';

interface HeaderProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onScrollTo: (sectionId: string) => void;
}

export function Header({ lang, onChangeLang, onScrollTo }: HeaderProps) {
  const isFr = lang === 'fr';

  return (
    <header className="sticky top-0 z-40 w-full bg-black/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#atelier"
          onClick={(e) => {
            e.preventDefault();
            onScrollTo('atelier');
          }}
          className="font-serif italic text-lg sm:text-xl font-semibold tracking-tight text-white hover:text-pale-oak transition-colors whitespace-nowrap shrink-0"
        >
          Eugène Perma Professionnel
        </a>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium tracking-wide text-white/75">
          <button
            type="button"
            onClick={() => onScrollTo('atelier')}
            className="hover:text-white hover:underline underline-offset-8 decoration-pale-oak transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFr ? 'Conseil Vocal' : 'Voice Atelier'}
          </button>
          <button
            type="button"
            onClick={() => onScrollTo('recap-chat')}
            className="hover:text-white hover:underline underline-offset-8 decoration-pale-oak transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFr ? 'Récapitulatif & Soins' : 'Recap & Products'}
          </button>
          <button
            type="button"
            onClick={() => onScrollTo('collections-preview')}
            className="hover:text-white hover:underline underline-offset-8 decoration-pale-oak transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFr ? 'Nos Marques' : 'Our Brands'}
          </button>
        </nav>

        {/* Zone 3: Sliding FR | EN Language Switcher */}
        <div className="flex items-center shrink-0">
          <div
            role="group"
            aria-label={isFr ? 'Choix de la langue vocale' : 'Voice language switch'}
            className="relative inline-grid grid-cols-2 items-center p-1 rounded-full bg-white/10 border border-white/15"
          >
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-pale-oak transition-transform duration-200 ease-out"
              style={{
                transform: isFr ? 'translateX(0%)' : 'translateX(100%)',
              }}
            />
            <button
              type="button"
              onClick={() => onChangeLang('fr')}
              aria-pressed={isFr}
              className={`relative z-10 px-3.5 py-1.5 text-xs font-semibold tracking-wider rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isFr ? 'text-black' : 'text-white/75 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              aria-pressed={!isFr}
              className={`relative z-10 px-3.5 py-1.5 text-xs font-semibold tracking-wider rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isFr ? 'text-black' : 'text-white/75 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
