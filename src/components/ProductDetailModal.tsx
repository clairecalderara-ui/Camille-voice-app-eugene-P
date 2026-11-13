import { useState } from 'react';
import { ExternalLink, X, Check } from 'lucide-react';
import type { EugeneProduct, Language } from '../types.ts';
import { PRODUCT_IMAGES } from '../utils/productImages.ts';

interface ProductDetailModalProps {
  product: EugeneProduct | null;
  lang: Language;
  onClose: () => void;
}

export function ProductDetailModal({ product, lang, onClose }: ProductDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!product) return null;

  const isFr = lang === 'fr';
  const name = isFr ? product.nameFr : product.nameEn;
  const tagline = isFr ? product.taglineFr : product.taglineEn;
  const benefits = isFr ? product.benefitsFr : product.benefitsEn;
  const howToUse = isFr ? product.howToUseFr : product.howToUseEn;
  const stepLabel = isFr ? product.stepLabelFr : product.stepLabelEn;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#121212] border border-white/15 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isFr ? 'Fermer la fiche produit' : 'Close product sheet'}
          className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-black/75 text-white hover:text-pale-oak flex items-center justify-center border border-white/15 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Studio photo */}
        <div className="md:col-span-5 bg-[#0A0A0A] flex items-center justify-center">
          {!imgFailed ? (
            <img
              src={PRODUCT_IMAGES[product.imageKey]}
              alt={name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-56 md:h-full object-cover"
            />
          ) : (
            <div className="p-8 text-center">
              <span className="font-serif italic text-lg text-pale-oak">{product.brand}</span>
            </div>
          )}
        </div>

        {/* Right: Routine details & application protocol */}
        <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="font-semibold text-pale-oak">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{stepLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{product.volume}</span>
            </div>

            <div>
              <h3
                id="product-modal-title"
                className="text-xl font-serif italic font-semibold text-white leading-snug"
              >
                {name}
              </h3>
              <p className="mt-1.5 text-sm text-white/75 leading-relaxed">{tagline}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-pale-oak">
                {isFr ? 'Bénéfices clés' : 'Key Benefits'}
              </h4>
              <ul className="space-y-1.5">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-pale-oak shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-pale-oak">
                {isFr ? 'Conseil d’application de Camille' : 'Camille’s Application Ritual'}
              </h4>
              <p className="text-xs text-white/85 leading-relaxed">{howToUse}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
            <span className="text-base font-semibold text-white tabular-nums">
              {product.priceEur.toFixed(2).replace('.', ',')} €
            </span>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pale-oak hover:bg-pale-oak-hover text-black text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {isFr ? 'Voir sur Eugène Perma Pro' : 'View on Eugène Perma Pro'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
